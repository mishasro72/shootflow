import tzlookup from "@photostructure/tz-lookup";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { locales } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlaceDetails, PlacesUnavailableError } from "@/lib/places/google";
import { placeIdSchema, sessionTokenSchema } from "@/lib/places/schemas";
import type { PickedPlace } from "@/lib/places/types";

/** GET /api/places/details?id=<place id>&session=<uuid>&lang=en */
const query = z.object({
  id: placeIdSchema,
  session: sessionTokenSchema,
  lang: z.enum(locales),
});

/** IANA zone for a point, offline. Approximate near borders; the photographer can still change it. */
function timeZoneAt(lat: number, lng: number): string | null {
  try {
    return tzlookup(lat, lng);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { id, session, lang } = parsed.data;

  try {
    // This request closes the autocomplete session that `session` started.
    const place = await getPlaceDetails(id, { sessionToken: session, languageCode: lang });
    if (!place) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body: PickedPlace = { ...place, timeZone: timeZoneAt(place.lat, place.lng) };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof PlacesUnavailableError) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
