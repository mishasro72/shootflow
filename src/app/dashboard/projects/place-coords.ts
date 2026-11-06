import "server-only";

import { getEnv } from "@/lib/env";
import { getPlaceDetails } from "@/lib/places/google";
import { isCoordsFresh } from "@/lib/places/policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Coordinates } from "./schema";

type ProjectPlace = {
  id: string;
  google_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  place_synced_at: string | null;
};

/**
 * Coordinates we may use right now, or null.
 * Google's coordinates are kept at most 30 days: when they are missing or older, they are
 * fetched again by place ID (the cheapest Places request) and saved with a new sync time.
 * Without an API key, or if Google fails, old coordinates are not used.
 */
export async function getFreshCoords(project: ProjectPlace): Promise<Coordinates | null> {
  const { location_lat: lat, location_lng: lng } = project;
  const saved = lat !== null && lng !== null ? { lat, lng } : null;

  if (!project.google_place_id) return saved;
  if (saved && isCoordsFresh(project.place_synced_at)) return saved;
  if (!getEnv().GOOGLE_MAPS_API_KEY) return null;

  try {
    const place = await getPlaceDetails(project.google_place_id, { locationOnly: true });
    if (!place) return null;

    const supabase = await createSupabaseServerClient();
    await supabase
      .from("projects")
      .update({ location_lat: place.lat, location_lng: place.lng, place_synced_at: new Date().toISOString() })
      .eq("id", project.id);
    return { lat: place.lat, lng: place.lng };
  } catch (error) {
    console.error(error);
    return null;
  }
}
