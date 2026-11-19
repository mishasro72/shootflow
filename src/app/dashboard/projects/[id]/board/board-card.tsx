"use client";

import { Camera, CameraOff, Lock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PALETTE_COLORS, paletteColors } from "@/lib/board/schemas";
import type { BoardItem, BoardKind, GroupRole } from "@/lib/board/tree";
import { cn } from "@/lib/utils";

import { useBoard } from "./board-feed";
import { CardMenu } from "./card-menu";

/** Colours a group can be marked with (the left edge of the card). */
const GROUP_COLORS = ["#e8dcc8", "#f2c46d", "#e07a5f", "#81b29a", "#7aa5d2", "#b392ac"];

/** One card of the feed: its content, or its editor when it is being edited. */
export function BoardCard({ item, handle, children }: { item: BoardItem; handle: ReactNode; children?: ReactNode }) {
  const t = useTranslations("Board");
  const { editingId } = useBoard();
  const isGroup = item.kind === "GROUP";
  const title = item.title || t("untitled");

  return (
    <article
      aria-label={title}
      className={cn("rounded-xl border bg-card p-3 text-sm", isGroup && "border-l-4")}
      style={isGroup && item.group_color ? { borderLeftColor: item.group_color } : undefined}
    >
      <header className="flex items-center gap-1">
        {handle}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs text-muted-foreground">{t(`kinds.${kindKey(item)}`)}</span>
          {item.status && (
            <span
              data-testid="review-status"
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs",
                item.status === "APPROVED" && "border-success/50 text-success",
                item.status === "CHANGES_REQUESTED" && "border-destructive/50 text-destructive",
              )}
            >
              {t(`status.${item.status}`)}
            </span>
          )}
          <Badges item={item} />
        </div>
        <CardMenu item={item} />
      </header>

      {editingId === item.id ? <CardEditor item={item} /> : <CardContent item={item} title={title} />}
      {children}
    </article>
  );
}

/** The label key of a card: groups are named by their role (Look or Section). */
function kindKey(item: BoardItem): Exclude<BoardKind, "GROUP"> | GroupRole {
  return item.kind === "GROUP" ? (item.group_role ?? "SECTION") : item.kind;
}

/** Small marks: who can see the card and whether it is left out of the shot list. */
function Badges({ item }: { item: BoardItem }) {
  const t = useTranslations("Board");
  const reviewable = item.status !== null;
  return (
    <>
      {item.visibility !== "EVERYONE" && (
        <span data-testid="visibility-badge" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {item.visibility === "PRIVATE" ? <Lock className="size-3" aria-hidden /> : <Users className="size-3" aria-hidden />}
          {t(`visibility.${item.visibility}`)}
        </span>
      )}
      {reviewable &&
        (item.in_shot_list ? (
          <Camera className="size-3.5 text-muted-foreground" aria-label={t("inShotList")} role="img" />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CameraOff className="size-3" aria-hidden />
            {t("notInShotList")}
          </span>
        ))}
    </>
  );
}

function CardContent({ item, title }: { item: BoardItem; title: string }) {
  const colors = item.kind === "PALETTE" ? paletteColors(item.payload) : [];
  return (
    <div className="mt-1 flex flex-col gap-2 px-1">
      <h3 className={cn("font-medium break-words", item.kind === "GROUP" && "text-base")}>{title}</h3>
      {item.body && <p className="whitespace-pre-wrap break-words text-muted-foreground">{item.body}</p>}
      {colors.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="palette">
          {colors.map((color, index) => (
            <li key={`${color}-${index}`} className="flex flex-col items-center gap-1">
              <span className="size-10 rounded-md border" style={{ backgroundColor: color }} aria-hidden />
              <code className="text-[11px] text-muted-foreground">{color}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Title and text for every card; colours for palettes; an edge colour for groups. */
function CardEditor({ item }: { item: BoardItem }) {
  const t = useTranslations("Board");
  const { save, setEditingId } = useBoard();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? "");
  const [colors, setColors] = useState(() => paletteColors(item.payload));
  const [groupColor, setGroupColor] = useState(item.group_color);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const ok = await save({
      id: item.id,
      title,
      body: body || null,
      ...(item.kind === "PALETTE" ? { colors } : {}),
      ...(item.kind === "GROUP" ? { groupColor } : {}),
    });
    setSaving(false);
    if (ok) setEditingId(null);
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-3 px-1" data-testid="card-editor">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`title-${item.id}`}>{t("titleLabel")}</Label>
        <Input id={`title-${item.id}`} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`body-${item.id}`}>{t("bodyLabel")}</Label>
        <Textarea id={`body-${item.id}`} value={body} maxLength={4000} rows={3} onChange={(e) => setBody(e.target.value)} />
      </div>

      {item.kind === "PALETTE" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">{t("colorsLabel")}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-1 rounded-md border p-1">
                <input
                  type="color"
                  value={color}
                  aria-label={t("colorN", { n: index + 1 })}
                  onChange={(e) => setColors((list) => list.map((c, i) => (i === index ? e.target.value : c)))}
                  className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                {colors.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("removeColor", { n: index + 1 })}
                    onClick={() => setColors((list) => list.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {colors.length < MAX_PALETTE_COLORS && (
              <Button type="button" variant="outline" size="sm" onClick={() => setColors((list) => [...list, "#888888"])}>
                {t("addColor")}
              </Button>
            )}
          </div>
        </fieldset>
      )}

      {item.kind === "GROUP" && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t("groupColor")}</legend>
          <div className="flex flex-wrap gap-2">
            {[null, ...GROUP_COLORS].map((color) => (
              <label key={color ?? "none"} className="cursor-pointer">
                <input
                  type="radio"
                  name={`group-color-${item.id}`}
                  className="peer sr-only"
                  checked={groupColor === color}
                  onChange={() => setGroupColor(color)}
                />
                <span
                  className="flex size-8 items-center justify-center rounded-full border text-xs text-muted-foreground peer-checked:ring-2 peer-checked:ring-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50"
                  style={color ? { backgroundColor: color } : undefined}
                >
                  {color ? <span className="sr-only">{color}</span> : t("noColor")}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {t("save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
