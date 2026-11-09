import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { uploadsEnabled } from "@/lib/storage/availability";
import { signUpload } from "@/lib/storage/r2";
import { signRequestSchema, type SignedFile } from "@/lib/storage/upload-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/uploads/sign  { projectId, files: [{ name, type, size }] }
 *
 * For each file: reserve its size in the studio's quota (a PENDING row; the database
 * refuses when there is no room) and return a short-lived URL to PUT the bytes straight
 * into R2. The file never passes through our server, so Vercel's limits do not apply.
 */
export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!uploadsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const parsed = signRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { projectId, files } = parsed.data;

  // RLS: another studio's project, or an archived one, is simply not found.
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const results: SignedFile[] = [];
  for (const file of files) {
    // One at a time: the database locks the studio row for each, so the quota stays exact.
    const { data: row, error } = await supabase
      .from("media_files")
      .insert({
        project_id: project.id,
        // Overwritten by a trigger from the project; required by the column.
        workspace_id: project.workspace_id,
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
      })
      .select("id, object_key")
      .single();

    if (error || !row) {
      results.push({ error: error?.message.includes("storage_quota_exceeded") ? "quota" : "failed" });
      continue;
    }
    results.push({ id: row.id, url: await signUpload(row.object_key, file.type) });
  }

  return NextResponse.json({ files: results });
}
