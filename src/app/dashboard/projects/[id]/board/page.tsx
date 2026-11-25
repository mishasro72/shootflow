import { ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { placeMeta } from "@/lib/board/schemas";
import type { BoardItem } from "@/lib/board/tree";
import { getEnv } from "@/lib/env";
import { uploadsEnabled } from "@/lib/storage/availability";
import { signDownload } from "@/lib/storage/r2";
import { placeLight } from "@/lib/sun/place-light";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { utcToZonedLocal } from "@/lib/time/zoned";

import { getProject } from "../../queries";
import { ProjectTabs } from "../project-tabs";

import { BoardFeed } from "./board-feed";
import { freshPlaceCoords } from "./place-coords";

/** Saving a link reads the page and its picture: give the server action time for that. */
export const maxDuration = 30;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [project, t] = await Promise.all([getProject(id), getTranslations("Board")]);
  return { title: project ? `${t("title")} · ${project.title}` : t("title") };
}

/**
 * The project board for the photographer: every live card, read through RLS. Photo cards
 * get signed links to their two copies here, on every view; the database keeps only keys.
 * Place cards get the light of the shoot day at that place, from coordinates we may still
 * use (refreshed by place ID when older than 30 days).
 */
export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [t, tProject, locale] = await Promise.all([getTranslations("Board"), getTranslations("Project"), getLocale()]);
  const supabase = await createSupabaseServerClient();
  const [{ data: items }, { count: trashed }] = await Promise.all([
    supabase
      .from("board_items")
      .select(
        "id, kind, group_role, group_color, parent_id, title, body, payload, sort_order, status, visibility, in_shot_list, created_at, image_key, thumb_key",
      )
      .eq("project_id", project.id)
      .is("deleted_at", null),
    supabase
      .from("board_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .not("deleted_at", "is", null),
  ]);

  const uploads = uploadsEnabled();
  const shootDate = project.shoot_start ? utcToZonedLocal(project.shoot_start, project.timezone).date : null;

  const cards: BoardItem[] = await Promise.all(
    (items ?? []).map(async ({ image_key, thumb_key, ...item }) => {
      const card: BoardItem = {
        ...(item as Omit<BoardItem, "thumb_url" | "image_url">),
        image_url: uploads && image_key ? await signDownload(image_key) : null,
        thumb_url: uploads && thumb_key ? await signDownload(thumb_key) : null,
      };
      if (item.kind !== "LOCATION") return card;

      const coords = await freshPlaceCoords(supabase, item);
      if (!coords) return { ...card, place_light: null };
      if (!shootDate) return { ...card, place_light: "noDate" };
      const zone = placeMeta(item.payload).timeZone ?? project.timezone;
      return {
        ...card,
        place_light: placeLight(
          shootDate,
          coords.lat,
          coords.lng,
          zone,
          locale,
          tProject("lightNone"),
          project.shoot_start,
        ),
      };
    }),
  );

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

      <BoardFeed
        projectId={project.id}
        items={cards}
        uploads={uploads}
        maps={Boolean(getEnv().GOOGLE_MAPS_API_KEY)}
      />

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
