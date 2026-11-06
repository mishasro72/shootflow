import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale } from "@/i18n/config";
import { buildCalendar } from "@/lib/calendar/ics";
import { icsResponse, shootEvent } from "@/lib/calendar/shoot-event";
import { getEnv } from "@/lib/env";
import { portalTokenSchema } from "@/lib/portal/secrets";
import { AdminUnavailableError, createSupabaseAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ token: string }> };

/** Past shoots stay in the feed this long, so last week's shoot does not vanish at once. */
const KEEP_PAST_DAYS = 90;

/**
 * GET /api/calendar/<token>/shoots.ics — every shoot of a studio, for calendar apps to
 * subscribe to (webcal://). The apps fetch it without signing in, so the secret token in
 * the URL is the only key; the studio owner can replace it in Settings.
 */
export async function GET(_request: NextRequest, { params }: Context) {
  const { token } = await params;
  if (!portalTokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id, name, brand_name, default_locale")
      .eq("calendar_feed_token", token)
      .maybeSingle();
    if (!workspace) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Only this studio's projects: the filter on workspace_id does what RLS does elsewhere.
    const since = new Date(Date.now() - KEEP_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: projects } = await admin
      .from("projects")
      .select(
        `id, title, shoot_start, shoot_end, timezone,
         location_name, location_address, location_map_url,
         client:project_clients (name)`,
      )
      .eq("workspace_id", workspace.id)
      .is("archived_at", null)
      .gte("shoot_start", since)
      .order("shoot_start", { ascending: true })
      .limit(500);

    const locale = isLocale(workspace.default_locale) ? workspace.default_locale : defaultLocale;
    const t = await getTranslations({ locale, namespace: "Calendar" });
    const appUrl = getEnv().NEXT_PUBLIC_APP_URL;

    const events = (projects ?? []).flatMap((project) => {
      if (!project.shoot_start) return [];
      const pageUrl = new URL(`/dashboard/projects/${project.id}`, appUrl).toString();
      const lines = [t("projectLink", { url: pageUrl })];
      if (project.location_map_url) lines.push(t("mapLink", { url: project.location_map_url }));
      return [
        shootEvent(
          { ...project, shoot_start: project.shoot_start },
          {
            summary: project.client
              ? t("summaryWithClient", { title: project.title, client: project.client.name })
              : project.title,
            description: lines.join("\n"),
            url: pageUrl,
          },
        ),
      ];
    });

    const studio = workspace.brand_name || workspace.name;
    const ics = buildCalendar(events, { name: t("feedName", { studio }), refreshMinutes: 60 });
    return icsResponse(ics, { maxAgeSeconds: 300 });
  } catch (error) {
    if (error instanceof AdminUnavailableError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    throw error;
  }
}
