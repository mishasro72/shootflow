import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Link2,
  MapPin,
  Pencil,
  StickyNote,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getEnv } from "@/lib/env";
import { getDayLight, goldenHourAdvice, type TimeRange } from "@/lib/sun/light";
import { formatShootDate, formatShootTime, formatTimeZone } from "@/lib/time/format";
import { utcToZonedLocal } from "@/lib/time/zoned";

import { archiveProject, shiftToGoldenHour } from "../actions";
import { getFreshCoords } from "../place-coords";
import { getProject } from "../queries";

import { ArchiveButton } from "./archive-button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.title };
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [t, tStatus, locale] = await Promise.all([
    getTranslations("Project"),
    getTranslations("ProjectStatus"),
    getLocale(),
  ]);
  const portalUrl = new URL(`/p/${project.access_token}`, getEnv().NEXT_PUBLIC_APP_URL).toString();

  // Light for the shoot day: needs a date and coordinates we may use (see getFreshCoords).
  const coords = project.shoot_start ? await getFreshCoords(project) : null;
  const light =
    project.shoot_start && coords
      ? getDayLight(
          utcToZonedLocal(project.shoot_start, project.timezone).date,
          coords.lat,
          coords.lng,
          project.timezone,
        )
      : null;
  const advice =
    light && project.shoot_start
      ? goldenHourAdvice(light, new Date(project.shoot_start), project.shoot_end ? new Date(project.shoot_end) : null)
      : null;

  /** "4:31 – 5:25 PM" in the project's time zone, or a dash when the day has no such light. */
  const span = (range: TimeRange | null) =>
    range
      ? formatShootTime(range.start.toISOString(), range.end.toISOString(), project.timezone, locale)
      : t("lightNone");
  const clock = (date: Date | null) =>
    date ? formatShootTime(date.toISOString(), null, project.timezone, locale) : t("lightNone");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{project.title}</h1>
          <span
            data-testid="project-status"
            className="mt-2 inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {tStatus(project.status)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/projects/${project.id}/edit`}>
              <Pencil aria-hidden />
              {t("edit")}
            </Link>
          </Button>
          {!project.archived_at && <ArchiveButton action={archiveProject.bind(null, project.id)} />}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={CalendarDays} title={t("when")} testId="project-when">
          {project.shoot_start ? (
            <>
              <p className="font-medium first-letter:uppercase">
                {formatShootDate(project.shoot_start, project.timezone, locale)}
              </p>
              <p>{formatShootTime(project.shoot_start, project.shoot_end, project.timezone, locale)}</p>
              <p className="text-xs text-muted-foreground">{formatTimeZone(project.timezone)}</p>
            </>
          ) : (
            <p className="text-muted-foreground">{t("noDate")}</p>
          )}
        </InfoCard>

        <InfoCard icon={MapPin} title={t("where")}>
          {project.location_name || project.location_address ? (
            <>
              {project.location_name && <p className="font-medium">{project.location_name}</p>}
              {project.location_address && <p>{project.location_address}</p>}
              {project.location_map_url && (
                <a
                  href={project.location_map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex w-fit items-center gap-1 underline-offset-4 hover:underline"
                >
                  {t("openMap")}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{t("noLocation")}</p>
          )}
        </InfoCard>

        <InfoCard icon={User} title={t("client")}>
          {project.client ? (
            <>
              <p className="font-medium">{project.client.name}</p>
              {project.client.email && <p className="break-all">{project.client.email}</p>}
              <p className="text-xs text-muted-foreground">
                {t("clientDetails", {
                  language: project.client_locale === "ru" ? "Русский" : "English",
                  limit: project.retouch_limit,
                })}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{t("noClient")}</p>
          )}
        </InfoCard>

        <InfoCard icon={StickyNote} title={t("notes")}>
          {project.notes ? (
            <p className="whitespace-pre-line">{project.notes}</p>
          ) : (
            <p className="text-muted-foreground">{t("noNotes")}</p>
          )}
        </InfoCard>
      </div>

      {light && (
        <InfoCard icon={Sun} title={t("light")} testId="project-light">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <LightRow label={t("lightMorningBlue")} value={span(light.morningBlue)} />
            <LightRow label={t("lightMorningGolden")} value={span(light.morningGolden)} />
            <LightRow label={t("lightSunrise")} value={clock(light.sunrise)} />
            <LightRow label={t("lightSunset")} value={clock(light.sunset)} />
            <LightRow label={t("lightEveningGolden")} value={span(light.eveningGolden)} />
            <LightRow label={t("lightEveningBlue")} value={span(light.eveningBlue)} />
          </dl>
          {advice && (
            <div
              data-testid="light-advice"
              className="mt-3 flex flex-col gap-3 rounded-lg bg-amber-50 p-3 text-amber-950 sm:flex-row sm:items-center dark:bg-amber-950/40 dark:text-amber-100"
            >
              <p className="flex-1">{t("lightAdvice", { window: advice.window, range: span(advice.range) })}</p>
              <form action={shiftToGoldenHour.bind(null, project.id)}>
                <SubmitButton className="sm:w-auto">
                  {t("lightShift", { time: clock(advice.range.start) })}
                </SubmitButton>
              </form>
            </div>
          )}
        </InfoCard>
      )}

      <InfoCard icon={Link2} title={t("clientLink")}>
        <p className="text-muted-foreground">{t("clientLinkLead")}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code data-testid="client-link" className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
            {portalUrl}
          </code>
          <CopyButton value={portalUrl} label={t("copyLink")} />
        </div>
      </InfoCard>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  testId,
  children,
}: {
  icon: LucideIcon;
  title: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="rounded-xl border bg-card p-4 text-sm">
      <h2 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        {title}
      </h2>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function LightRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
