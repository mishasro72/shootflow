import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { locales } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { autocompletePlaces, PlacesUnavailableError } from "@/lib/places/google";
import { sessionTokenSchema } from "@/lib/places/schemas";

/** GET /api/places/autocomplete?q=dix+park&session=<uuid>&lang=en */
const query = z.object({
  q: z.string().trim().min(3).max(200),
  session: sessionTokenSchema,
  lang: z.enum(locales),
});

export async function GET(request: NextRequest) {
  // Only signed-in photographers may spend the studio's Google quota.
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { q, session, lang } = parsed.data;

  try {
    const suggestions = await autocompletePlaces(q, session, lang);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof PlacesUnavailableError) {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
