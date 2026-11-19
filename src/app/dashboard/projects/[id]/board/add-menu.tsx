"use client";

import { Layers, Palette, Plus, Shirt, StickyNote } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NewCardKind } from "@/lib/board/schemas";

import { useBoard } from "./board-feed";

const ICONS = { LOOK: Shirt, SECTION: Layers, NOTE: StickyNote, PALETTE: Palette } as const;

/**
 * "Add" at the end of the feed (every kind) and inside a group (cards; a top-level
 * Section also takes Looks). The new card opens for editing at once.
 */
export function AddMenu({
  parentId,
  variant,
  allowLook = false,
}: {
  parentId: string | null;
  variant: "primary" | "inline";
  allowLook?: boolean;
}) {
  const t = useTranslations("Board");
  const { add, pending } = useBoard();
  const kinds: NewCardKind[] = parentId
    ? [...(allowLook ? (["LOOK"] as const) : []), "NOTE", "PALETTE"]
    : ["LOOK", "SECTION", "NOTE", "PALETTE"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant === "primary" ? "default" : "ghost"}
          size="sm"
          className="w-fit"
          disabled={pending}
          data-testid={parentId ? "add-inside" : "add-card"}
        >
          <Plus aria-hidden />
          {parentId ? t("addInside") : t("add")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {kinds.map((kind) => {
          const Icon = ICONS[kind];
          return (
            <DropdownMenuItem key={kind} onSelect={() => add(kind, parentId)}>
              <Icon aria-hidden />
              {t(`kinds.${kind}`)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
