import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getPhotographerContext } from "@/lib/auth/session";
import { listTimeZones } from "@/lib/time/time-zones";

import { createProject } from "../actions";
import { ProjectForm } from "../project-form";
import type { ProjectFormValues } from "../schema";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ProjectForm");
  return { title: t("newTitle") };
}

export default async function NewProjectPage() {
  const context = await getPhotographerContext();
  if (!context) redirect("/login");
  const t = await getTranslations("ProjectForm");

  // Sensible starting values from the photographer's profile and studio settings.
  const defaults: ProjectFormValues = {
    title: "",
    shootDate: "",
    startTime: "",
    endTime: "",
    timezone: context.profile.timezone,
    locationName: "",
    locationAddress: "",
    notes: "",
    retouchLimit: String(context.workspace.default_retouch_limit),
    clientLocale: context.workspace.default_locale,
    clientName: "",
    clientEmail: "",
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>
      <ProjectForm
        action={createProject}
        defaultValues={defaults}
        timeZones={listTimeZones(defaults.timezone)}
        submitLabel={t("create")}
        cancelHref="/dashboard"
      />
    </div>
  );
}
