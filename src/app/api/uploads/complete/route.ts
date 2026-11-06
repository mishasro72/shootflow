import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { uploadsEnabled } from "@/lib/storage/availability";
import { deleteObject, objectSize } from "@/lib/storage/r2";
import { completeRequestSchema } from "@/lib/storage/upload-rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/uploads/complete  { id }
 *
 * The browser says "I uploaded it". We do not take its word: we ask R2 for the object and
 * compare its size with the reservation. Only then the file becomes READY and counts in
 * the studio's storage. A file of another size is removed, so the quota cannot be cheated.
 */
export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!uploadsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const parsed = completeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // RLS first: only a file of this photographer's studio is found.
  const supabase = await createSupabaseServerClient();
  const { data: file } = await supabase
    .from("media_files")
    .select("id, object_key, size_bytes, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (file.status === "READY") return NextResponse.json({ id: file.id });

  const size = await objectSize(file.object_key);
  if (size === null) return NextResponse.json({ error: "not_uploaded" }, { status: 409 });

  if (size !== file.size_bytes) {
    await deleteObject(file.object_key);
    await supabase.from("media_files").delete().eq("id", file.id);
    return NextResponse.json({ error: "size_mismatch" }, { status: 422 });
  }

  // Photographers have no right to change the status; the server does it with the secret key.
  const { error } = await createSupabaseAdminClient()
    .from("media_files")
    .update({ status: "READY", uploaded_at: new Date().toISOString() })
    .eq("id", file.id)
    .eq("status", "PENDING");
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });

  return NextResponse.json({ id: file.id });
}
