"use server";

import { revalidatePath } from "next/cache";

import { getPhotographerContext } from "@/lib/auth/session";
import { newSecretToken } from "@/lib/portal/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * A new calendar feed link for the studio. Subscriptions with the old link stop updating.
 * Only the owner may do it, because the feed belongs to the whole studio.
 */
export async function rotateCalendarFeed(): Promise<void> {
  const context = await getPhotographerContext();
  if (!context || context.role !== "OWNER") return;

  await createSupabaseAdminClient()
    .from("workspaces")
    .update({ calendar_feed_token: newSecretToken() })
    .eq("id", context.workspace.id);
  revalidatePath("/dashboard/settings");
}