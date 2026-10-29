import { CalendarDays, Camera, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { getPhotographerContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const context = await getPhotographerContext();
  const t = await getTranslations("Dashboard");
  const tStatus = await getTranslations("ProjectStatus");
  const locale = await getLocale();

  // RLS limits this to the photographer's own workspace.
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, shoot_start, timezone, location_name")
    .is("archived_at", null)
    .order("shoot_start", { ascending: true, nullsFirst: false });

  const list = projects ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("greeting", { name: context?.profile.name ?? "" })}
        </p>
      </div>

      {list.length === 0 ? (
        <div
          data-testid="projects-empty"
          className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center"
        >
          <Camera className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-medium">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyLead")}</p>
        </div>
      ) : (
        <ul data-testid="projects-list" className="grid gap-3 sm:grid-cols-2">
          {list.map((project) => (
            <li key={project.id} className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium">{project.title}</h2>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {tStatus(project.status)}
                </span>
              </div>
              <dl className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">{t("shootDate")}</dt>
                  <CalendarDays className="size-4 shrink-0" aria-hidden />
                  <dd>
                    {project.shoot_start
                      ? new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: project.timezone,
                        }).format(new Date(project.shoot_start))
                      : t("noDate")}
                  </dd>
                </div>
                {project.location_name && (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">{t("location")}</dt>
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    <dd className="truncate">{project.location_name}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
