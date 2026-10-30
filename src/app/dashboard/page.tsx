import { CalendarDays, Camera, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getPhotographerContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatShootShort } from "@/lib/time/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const context = await getPhotographerContext();
  const t = await getTranslations("Dashboard");
  const tStatus = await getTranslations("ProjectStatus");
  const locale = await getLocale();

  // RLS limits this to the photographer's own workspace. Shoots with a date come first,
  // soonest first; drafts without a date go to the end.
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, shoot_start, timezone, location_name")
    .is("archived_at", null)
    .order("shoot_start", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const list = projects ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("greeting", { name: context?.profile.name ?? "" })}
          </p>
        </div>
        {list.length > 0 && (
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus aria-hidden />
              {t("newProject")}
            </Link>
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <div
          data-testid="projects-empty"
          className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center"
        >
          <Camera className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-medium">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyLead")}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/projects/new">
              <Plus aria-hidden />
              {t("createFirst")}
            </Link>
          </Button>
        </div>
      ) : (
        <ul data-testid="projects-list" className="grid gap-3 sm:grid-cols-2">
          {list.map((project) => (
            <li key={project.id}>
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="block h-full rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium break-words">{project.title}</h2>
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
                        ? formatShootShort(project.shoot_start, project.timezone, locale)
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
