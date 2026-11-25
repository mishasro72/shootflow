"use client";

import { ImageIcon, Layers, Palette, Plus, Shirt, StickyNote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

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
 * Section also takes Looks). The new card opens for editing at once. "Photo" opens the
 * file picker (several photos at once, HEIC too); the input lives outside the menu,
 * because the menu's content is removed from the page when it closes.
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
  const { add, addImages, pending, uploads } = useBoard();
  const fileInput = useRef<HTMLInputElement>(null);
  const kinds: NewCardKind[] = parentId
    ? [...(allowLook ? (["LOOK"] as const) : []), "NOTE", "PALETTE"]
    : ["LOOK", "SECTION", "NOTE", "PALETTE"];

  return (
    <>
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
          {uploads && (
            <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
              <ImageIcon aria-hidden />
              {t("kinds.IMAGE")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {uploads && (
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid={parentId ? "board-image-input-inside" : "board-image-input"}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = ""; // the same photo can be chosen again later
            addImages(files, parentId);
          }}
        />
      )}
    </>
  );
}
