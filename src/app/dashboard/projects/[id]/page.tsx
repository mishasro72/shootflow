import { ArrowLeft, CalendarDays, Link2, MapPin, Pencil, StickyNote, User, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { getEnv } from "@/lib/env";
import { formatShootDate, formatShootTime, formatTimeZone } from "@/lib/time/format";

import { archiveProject } from "../actions";
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
