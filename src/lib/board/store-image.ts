import "server-only";

import { putObject } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Stores a picture the server downloaded (a link's preview) as a BOARD file of the
 * project and returns its object key, or null if there is no room or storage fails.
 * Same rules as a browser upload: the row is created through RLS (the database
 * reserves the size in the studio's quota), then the bytes go to R2, then the server
 * marks the file READY with the secret key.
 */
export async function storeBoardImage(
  supabase: Supabase,
  project: { id: string; workspace_id: string },
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
  fileName: string,
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from("media_files")
    .insert({
      project_id: project.id,
      // Overwritten by a trigger from the project; required by the column.
      workspace_id: project.workspace_id,
      file_name: fileName,
      content_type: contentType,
      size_bytes: bytes.byteLength,
      purpose: "BOARD",
    })
    .select("id, object_key")
    .single();
  if (error || !row) return null;

  try {
    await putObject(row.object_key, bytes, contentType);
    const { error: ready } = await createSupabaseAdminClient()
      .from("media_files")
      .update({ status: "READY", uploaded_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "PENDING");
    if (ready) throw ready;
    return row.object_key;
  } catch {
    // The row (and its quota) goes; if the bytes made it to R2, the deletion queue removes them.
    await supabase.from("media_files").delete().eq("id", row.id);
    return null;
  }
}
