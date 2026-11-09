"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { deleteObject } from "@/lib/storage/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const fileId = z.uuid();

/**
 * Deletes a project file: first the bytes in R2, then the row. The row is read and
 * deleted through RLS, so only the studio's own files can be touched; a database
 * trigger gives the file's size back to the studio's storage.
 */
export async function deleteProjectFile(id: string): Promise<void> {
  if (!fileId.safeParse(id).success) return;

  const supabase = await createSupabaseServerClient();
  const { data: file } = await supabase
    .from("media_files")
    .select("id, project_id, object_key")
    .eq("id", id)
    .maybeSingle();
  if (!file) return;

  await deleteObject(file.object_key);
  await supabase.from("media_files").delete().eq("id", file.id);
  revalidatePath(`/dashboard/projects/${file.project_id}`);
  revalidatePath("/dashboard/settings");
}
