/**
 * Rules for data that comes from Google Places. Plain functions, safe in the browser too.
 *
 * Google's terms let us keep a place ID for as long as we like, but coordinates from
 * Places only for 30 days. So we store `place_synced_at`, refresh the coordinates by
 * place ID when they get old, and a nightly job clears the ones nobody refreshed.
 */
export const PLACE_COORDS_MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Place IDs are URL-safe text, e.g. "ChIJN1t_tDeuEmsRUsoyG83frY4". */
export const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,300}$/;

/** True while coordinates synced at `syncedAt` may still be used. */
export function isCoordsFresh(syncedAt: string | null, now: Date = new Date()): boolean {
  if (!syncedAt) return false;
  const age = now.getTime() - new Date(syncedAt).getTime();
  return age >= 0 && age < PLACE_COORDS_MAX_AGE_DAYS * DAY_MS;
}

/**
 * A link that opens the place in Google Maps (app or web), built from the place ID as the
 * Maps URLs documentation describes. `query` is only a fallback label.
 */
export function googleMapsUrl(name: string | null, placeId: string): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", name?.trim() || placeId);
  url.searchParams.set("query_place_id", placeId);
  return url.toString();
}
