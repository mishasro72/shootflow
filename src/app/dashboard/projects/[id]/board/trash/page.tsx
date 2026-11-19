import { ArrowLeft, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getProject } from "../../../queries";
import { restoreBoardCard } from "../actions";

type Props = { params: Promise<{ id: string }> };

/** Cards stay in the trash this long; a nightly job removes them afterwards. */
const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Board");
  return { title: t("trashTitle") };
}

/**
 * The board's trash: cards deleted in the last 30 days, newest first, each with how many
 * days it has left. A group's cards are listed under it and come back with it.
 */
export default async function BoardTrashPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const t = await getTranslations("Board");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("board_items")
    .select("id, kind, group_role, parent_id, title, deleted_at")
    .eq("project_id", project.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const items = data ?? [];
  const trashedIds = new Set(items.map((item) => item.id));
  // A card trashed with its group comes back with the group, so only the group is offered.
  const roots = items.filter((item) => !(item.parent_id && trashedIds.has(item.parent_id)));
  const now = Date.now();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href={`/dashboard/projects/${project.id}/board`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToBoard")}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("trashTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("trashLead", { days: TRASH_DAYS })}</p>
      </div>

      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("trashEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {roots.map((item) => {
            const deletedAt = new Date(item.deleted_at ?? now).getTime();
            const daysLeft = Math.max(TRASH_DAYS - Math.floor((now - deletedAt) / DAY_MS), 0);
            const inside = items.filter((child) => child.parent_id === item.id).length;
            const kind = item.kind === "GROUP" ? (item.group_role ?? "SECTION") : item.kind;
            return (
              <li
                key={item.id}
                data-testid="trash-row"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title || t("untitled")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`kinds.${kind}`)}
                    {inside > 0 && ` · ${t("trashInside", { count: inside })}`}
                    {` · ${t("daysLeft", { days: daysLeft })}`}
                  </p>
                </div>
                <form action={restoreBoardCard.bind(null, item.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <RotateCcw aria-hidden />
                    {t("restore")}
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
