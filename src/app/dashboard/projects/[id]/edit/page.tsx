import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { listTimeZones } from "@/lib/time/time-zones";

import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";
import { getProject } from "../../queries";
import { projectToFormValues } from "../../schema";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  const t = await getTranslations("ProjectForm");
  return { title: project ? `${t("editTitle")}: ${project.title}` : t("editTitle") };
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const t = await getTranslations("ProjectForm");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("editTitle")}</h1>
      <ProjectForm
        // bind fixes the first argument (the project id); the form supplies the rest.
        action={updateProject.bind(null, project.id)}
        defaultValues={projectToFormValues(project, project.client)}
        timeZones={listTimeZones(project.timezone)}
        submitLabel={t("save")}
        cancelHref={`/dashboard/projects/${project.id}`}
      />
    </div>
  );
}
