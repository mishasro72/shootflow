"use client";

import { ArrowDown, ArrowUp, CornerDownRight, CornerUpLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siblingIds, targetGroups, type BoardItem } from "@/lib/board/tree";

import { useBoard } from "./board-feed";

const VISIBILITIES = ["EVERYONE", "TEAM", "PRIVATE"] as const;

/**
 * Everything one can do with a card: edit, move up or down, move into a group or out of
 * it, choose who sees it, keep it out of the shot list, send it to the trash.
 */
export function CardMenu({ item }: { item: BoardItem }) {
  const t = useTranslations("Board");
  const board = useBoard();
  const title = item.title || t("untitled");
  const list = siblingIds(board.feed, item.parent_id);
  const index = list.indexOf(item.id);
  const groups = targetGroups(board.feed, item);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={t("menu", { title })} disabled={board.pending}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => board.setEditingId(item.id)}>
          <Pencil aria-hidden />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={index <= 0} onSelect={() => board.step(item, -1)}>
          <ArrowUp aria-hidden />
          {t("moveUp")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={index === -1 || index >= list.length - 1} onSelect={() => board.step(item, 1)}>
          <ArrowDown aria-hidden />
          {t("moveDown")}
        </DropdownMenuItem>

        {(groups.length > 0 || item.parent_id) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("moveTo")}</DropdownMenuLabel>
            {item.parent_id && (
              <DropdownMenuItem onSelect={() => board.move(item, null)}>
                <CornerUpLeft aria-hidden />
                {t("moveToTop")}
              </DropdownMenuItem>
            )}
            {groups.map((group) => (
              <DropdownMenuItem key={group.id} onSelect={() => board.move(item, group.id)}>
                <CornerDownRight aria-hidden />
                <span className="truncate">{group.title || t("untitled")}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("visibilityTitle")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={item.visibility} onValueChange={(value) => board.setVisibility(item, value)}>
          {VISIBILITIES.map((visibility) => (
            <DropdownMenuRadioItem key={visibility} value={visibility}>
              {t(`visibility.${visibility}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {item.status !== null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={item.in_shot_list}
              onCheckedChange={(checked) => board.setInShotList(item, checked === true)}
            >
              {t("inShotList")}
            </DropdownMenuCheckboxItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => board.trash(item)}>
          <Trash2 aria-hidden />
          {t("trash")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
