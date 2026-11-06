import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { portalTokenSchema } from "./secrets";

/**
 * The project behind a client link, or null for an unknown, malformed or archived link.
 * Every /api/p/[token]/... handler calls this first and works only with the project it
 * returns. The PIN hash never leaves this function: callers get `hasPin`.
 */
export async function findPortalProject(token: string) {
  if (!portalTokenSchema.safeParse(token).success) return null;

  const { data } = await createSupabaseAdminClient()
    .from("projects")
    .select(
      `id, title, shoot_start, shoot_end, timezone,
       location_name, location_address, location_map_url, client_locale, pin_hash,
       workspace:workspaces (name, brand_name)`,
    )
    .eq("access_token", token)
    .is("archived_at", null)
    .maybeSingle();
  if (!data) return null;

  const { pin_hash, workspace, ...project } = data;
  return {
    ...project,
    hasPin: pin_hash !== null,
    studioName: workspace?.brand_name || workspace?.name || "",
  };
}

export type PortalProject = NonNullable<Awaited<ReturnType<typeof findPortalProject>>>;
