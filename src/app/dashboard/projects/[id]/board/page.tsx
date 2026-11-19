import { ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { BoardItem } from "@/lib/board/tree";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getProject } from "../../queries";
import { ProjectTabs } from "../project-tabs";

import { BoardFeed } from "./board-feed";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [project, t] = await Promise.all([getProject(id), getTranslations("Board")]);
  return { title: project ? `${t("title")} · ${project.title}` : t("title") };
}

/** The project board for the photographer: every live card, read through RLS. */
export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [t, tProject] = await Promise.all([getTranslations("Board"), getTranslations("Project")]);
  const supabase = await createSupabaseServerClient();
  const [{ data: items }, { count: trashed }] = await Promise.all([
    supabase
      .from("board_items")
      .select(
        "id, kind, group_role, group_color, parent_id, title, body, payload, sort_order, status, visibility, in_shot_list, created_at",
      )
      .eq("project_id", project.id)
      .is("deleted_at", null),
    supabase
      .from("board_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .not("deleted_at", "is", null),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {tProject("back")}
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{project.title}</h1>
        <ProjectTabs projectId={project.id} />
      </div>

      <p className="text-sm text-muted-foreground">{t("lead")}</p>

      <BoardFeed projectId={project.id} items={(items ?? []) as BoardItem[]} />

      <Link
        href={`/dashboard/projects/${project.id}/board/trash`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        data-testid="trash-link"
      >
        <Trash2 className="size-4" aria-hidden />
        {t("trashLink", { count: trashed ?? 0 })}
      </Link>
    </div>
  );
}
