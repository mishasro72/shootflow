import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Loads one project with its client for the signed-in photographer, or null when it does
 * not exist or belongs to another studio (RLS hides it; both look the same, on purpose).
 * `cache` lets the page and generateMetadata share one database request.
 */
export const getProject = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select(
      `id, title, status, shoot_start, shoot_end, timezone,
       location_name, location_address, location_map_url,
       google_place_id, location_lat, location_lng, place_synced_at,
       notes, retouch_limit, client_locale, access_token, archived_at,
       client:project_clients (name, email)`,
    )
    .eq("id", id)
    .maybeSingle();

  return data;
});

export type ProjectDetails = NonNullable<Awaited<ReturnType<typeof getProject>>>;