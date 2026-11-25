import "server-only";

import { placeMeta } from "@/lib/board/schemas";
import { getEnv } from "@/lib/env";
import { getPlaceDetails } from "@/lib/places/google";
import { isCoordsFresh } from "@/lib/places/policy";
import type { Json } from "@/lib/supabase/database.types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Coordinates of a place card we may use right now, or null. Same rule as for projects
 * (../../place-coords.ts): Google's coordinates are kept at most 30 days, so old or missing
 * ones are fetched again by place ID (the cheapest Places request) and saved with a new
 * sync time. A place typed by hand has no coordinates.
 */
export async function freshPlaceCoords(
  supabase: Supabase,
  card: { id: string; payload: Json },
): Promise<{ lat: number; lng: number } | null> {
  const meta = placeMeta(card.payload);
  const saved = meta.lat !== null && meta.lng !== null ? { lat: meta.lat, lng: meta.lng } : null;

  if (!meta.placeId) return null;
  if (saved && isCoordsFresh(meta.syncedAt)) return saved;
  if (!getEnv().GOOGLE_MAPS_API_KEY) return null;

  try {
    const place = await getPlaceDetails(meta.placeId, { locationOnly: true });
    if (!place) return null;
    await supabase
      .from("board_items")
      .update({
        payload: {
          ...(card.payload as { [key: string]: Json | undefined }),
          lat: place.lat,
          lng: place.lng,
          synced_at: new Date().toISOString(),
        },
      })
      .eq("id", card.id);
    return { lat: place.lat, lng: place.lng };
  } catch {
    return null;
  }
}
