import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale } from "@/i18n/config";
import { buildCalendar } from "@/lib/calendar/ics";
import { icsResponse, shootEvent } from "@/lib/calendar/shoot-event";
import { getEnv } from "@/lib/env";
import { findPortalProject } from "@/lib/portal/access";
import { AdminUnavailableError } from "@/lib/supabase/admin";
import { utcToZonedLocal } from "@/lib/time/zoned";

type Context = { params: Promise<{ token: string }> };

/** GET /api/p/<token>/calendar.ics — "Add to calendar" for the client. */
export async function GET(_request: NextRequest, { params }: Context) {
  const { token } = await params;
  try {
    // The token comes first: nothing else runs for an unknown link.
    const project = await findPortalProject(token);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    // A PIN-protected page will need the PIN session from step 8; until then this stays closed.
    if (project.hasPin) return NextResponse.json({ error: "pin_required" }, { status: 403 });
    if (!project.shoot_start) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const locale = isLocale(project.client_locale) ? project.client_locale : defaultLocale;
    const t = await getTranslations({ locale, namespace: "Calendar" });
    const pageUrl = new URL(`/p/${token}`, getEnv().NEXT_PUBLIC_APP_URL).toString();
    const lines = [t("clientLink", { url: pageUrl })];
    if (project.location_map_url) lines.push(t("mapLink", { url: project.location_map_url }));

    const event = shootEvent(
      { ...project, shoot_start: project.shoot_start },
      {
        summary: project.studioName
          ? t("summaryForClient", { title: project.title, studio: project.studioName })
          : project.title,
        description: lines.join("\n"),
        url: pageUrl,
      },
    );
    const day = utcToZonedLocal(project.shoot_start, project.timezone).date;
    return icsResponse(buildCalendar([event]), { filename: `shoot-${day}.ics` });
  } catch (error) {
    if (error instanceof AdminUnavailableError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    throw error;
  }
}
