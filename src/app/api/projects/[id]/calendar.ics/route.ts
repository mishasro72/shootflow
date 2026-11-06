import { getLocale, getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { getProject } from "@/app/dashboard/projects/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { buildCalendar } from "@/lib/calendar/ics";
import { icsResponse, shootEvent } from "@/lib/calendar/shoot-event";
import { getEnv } from "@/lib/env";
import { utcToZonedLocal } from "@/lib/time/zoned";

type Context = { params: Promise<{ id: string }> };

/** GET /api/projects/<id>/calendar.ics — the photographer's own copy of one shoot. */
export async function GET(_request: NextRequest, { params }: Context) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  // RLS: another studio's project is simply not found.
  const project = await getProject(id);
  if (!project?.shoot_start) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const t = await getTranslations({ locale: await getLocale(), namespace: "Calendar" });
  const pageUrl = new URL(`/dashboard/projects/${project.id}`, getEnv().NEXT_PUBLIC_APP_URL).toString();
  const lines = [t("projectLink", { url: pageUrl })];
  if (project.location_map_url) lines.push(t("mapLink", { url: project.location_map_url }));

  const event = shootEvent(
    { ...project, shoot_start: project.shoot_start },
    {
      summary: project.client
        ? t("summaryWithClient", { title: project.title, client: project.client.name })
        : project.title,
      description: lines.join("\n"),
      url: pageUrl,
    },
  );
  const day = utcToZonedLocal(project.shoot_start, project.timezone).date;
  return icsResponse(buildCalendar([event]), { filename: `shoot-${day}.ics` });
}
