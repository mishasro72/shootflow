"use client";

import { Camera, CameraOff, ExternalLink, ImageOff, Lock, MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { PlaceSearch } from "@/components/places/place-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { imageMeta, linkMeta, MAX_PALETTE_COLORS, paletteColors, placeMeta } from "@/lib/board/schemas";
import type { BoardItem, BoardKind, GroupRole } from "@/lib/board/tree";
import { measureImage } from "@/lib/images/prepare";
import { addressMapUrl, googleMapsUrl } from "@/lib/places/policy";
import type { PickedPlace } from "@/lib/places/types";
import { cn } from "@/lib/utils";

import { saveLinkLook } from "./actions";
import { useBoard } from "./board-feed";
import { CardMenu } from "./card-menu";
import { ShadowDial } from "./shadow-dial";

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
          {item.visibility === "PRIVATE" ? (
            <Lock className="size-3" aria-hidden />
          ) : (
            <Users className="size-3" aria-hidden />
          )}
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
      {item.kind === "IMAGE" && <Photo item={item} title={title} />}
      {item.kind === "LINK" && <LinkPreview item={item} />}
      <h3 className={cn("font-medium break-words", item.kind === "GROUP" && "text-base")}>{title}</h3>
      {item.body && <p className="whitespace-pre-wrap break-words text-muted-foreground">{item.body}</p>}
      {item.kind === "LOCATION" && <PlaceInfo item={item} />}
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

/**
 * A photo card's picture. The 400 px thumbnail loads first; on a wide or sharp screen the
 * browser picks the 2048 px copy from `srcSet`. Width and height reserve the space, so the
 * feed does not jump while pictures load. A tap opens the big copy in a new tab.
 */
function Photo({ item, title }: { item: BoardItem; title: string }) {
  const t = useTranslations("Board");
  const meta = imageMeta(item.payload);
  if (!item.thumb_url) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageOff className="size-6" aria-hidden />
        <span className="sr-only">{t("imageUnavailable")}</span>
      </div>
    );
  }
  return (
    <a
      href={item.image_url ?? item.thumb_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("openImage", { title })}
      className="block overflow-hidden rounded-lg bg-muted"
    >
      {/* Signed links expire, so next/image would cache them longer than they live. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.thumb_url}
        srcSet={item.image_url ? `${item.thumb_url} 400w, ${item.image_url} 2048w` : undefined}
        sizes="(min-width: 768px) 720px, 100vw"
        width={meta?.width}
        height={meta?.height}
        alt={title}
        loading="lazy"
        decoding="async"
        data-testid="board-image"
        className="h-auto max-h-[70vh] w-full object-contain"
      />
    </a>
  );
}

/**
 * A link card: the page's picture (copied into our storage) and the site name, the whole
 * block opening the page in a new tab. Until an address is saved, a hint.
 */
function LinkPreview({ item }: { item: BoardItem }) {
  const t = useTranslations("Board");
  const meta = linkMeta(item.payload);
  useLinkLook(item, meta);
  if (!meta) return <p className="text-muted-foreground">{t("linkEmpty")}</p>;
  return (
    <a
      href={meta.url}
      target="_blank"
      // nofollow: the board is not a list of recommendations; noreferrer hides our address.
      rel="noopener noreferrer nofollow"
      aria-label={t("openLink", { site: meta.site })}
      className="block overflow-hidden rounded-lg border hover:bg-accent/40"
      data-testid="link-preview"
    >
      {item.thumb_url && (
        // A signed, expiring URL: next/image would cache it longer than it lives.
        // The picture keeps its own proportions, like a photo: a tall pin is not cropped.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumb_url}
          alt=""
          width={meta.width ?? undefined}
          height={meta.height ?? undefined}
          loading="lazy"
          decoding="async"
          className="h-auto max-h-[70vh] w-full bg-muted object-contain"
        />
      )}
      <span className="flex flex-col gap-0.5 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{meta.site}</span>
        </span>
        {meta.description && <span className="line-clamp-2 text-xs text-muted-foreground">{meta.description}</span>}
      </span>
    </a>
  );
}

/**
 * Measures a link's stored picture once, in the browser: its size (to show it whole) and
 * its colours (for "Palette from photo"). The server stores the picture but does not
 * decode images. Runs again on a later visit if it failed (the picture did not load).
 */
function useLinkLook(item: BoardItem, meta: ReturnType<typeof linkMeta>) {
  const router = useRouter();
  // The picture last measured: a new address brings a new picture to measure.
  const measured = useRef<string | null>(null);
  const url = item.thumb_url;
  const needed = Boolean(meta && url && meta.palette === null);

  useEffect(() => {
    if (!needed || !url || measured.current === url) return;
    measured.current = url;
    (async () => {
      try {
        // no-store: an <img> may have cached the picture without CORS headers (see 7a-2b-1).
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const look = await measureImage(await response.blob());
        const result = await saveLinkLook({ id: item.id, ...look });
        if (result.ok) router.refresh();
      } catch {
        // Not worth bothering the photographer: the card works without its colours.
      }
    })();
  }, [needed, url, item.id, router]);
}

/**
 * A place card: a link to the map (by Google place ID, or a search for the address typed
 * by hand), the light of the shoot day at that place and the shadows through that day,
 * worked out on the server.
 */
function PlaceInfo({ item }: { item: BoardItem }) {
  const t = useTranslations("Board");
  const { placeId } = placeMeta(item.payload);
  const typed = item.body || item.title;
  const mapUrl = placeId ? googleMapsUrl(item.title, placeId) : typed ? addressMapUrl(typed) : null;
  const light = item.place_light;

  return (
    <div className="flex flex-col gap-2">
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 underline-offset-4 hover:underline"
        >
          <MapPin className="size-4 shrink-0" aria-hidden />
          {t("placeOpenMap")}
        </a>
      )}
      {light === "noDate" && <p className="text-xs text-muted-foreground">{t("placeLightNoDate")}</p>}
      {light && light !== "noDate" && (
        <div className="rounded-md bg-muted px-3 py-2 text-xs" data-testid="place-light">
          <p className="mb-1 font-medium">{t("placeLightTitle", { date: light.date })}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-muted-foreground">{t("placeMorningGolden")}</dt>
            <dd>{light.morningGolden}</dd>
            <dt className="text-muted-foreground">{t("placeEveningGolden")}</dt>
            <dd>{light.eveningGolden}</dd>
            <dt className="text-muted-foreground">{t("placeSunrise")}</dt>
            <dd>{light.sunrise}</dd>
            <dt className="text-muted-foreground">{t("placeSunset")}</dt>
            <dd>{light.sunset}</dd>
          </dl>
        </div>
      )}
      {light && light !== "noDate" && <ShadowDial sun={light.sun} openAt={light.openAt} />}
    </div>
  );
}

/**
 * Title and text for every card; colours for palettes; an edge colour for groups; the
 * address for a link; Google place search for a place (name and address stay editable).
 */
function CardEditor({ item }: { item: BoardItem }) {
  const t = useTranslations("Board");
  const { save, saveLink, saveLocation, setEditingId, maps } = useBoard();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? "");
  const [colors, setColors] = useState(() => paletteColors(item.payload));
  const [groupColor, setGroupColor] = useState(item.group_color);
  const [url, setUrl] = useState(() => linkMeta(item.payload)?.url ?? "");
  // undefined: keep the card's place; null: unlink it; a value: newly picked.
  const [place, setPlace] = useState<PickedPlace | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const isLink = item.kind === "LINK";
  const isPlace = item.kind === "LOCATION";
  const linked = place === undefined ? placeMeta(item.payload).placeId !== null : place !== null;

  function pick(picked: PickedPlace, fallbackName: string) {
    setPlace(picked);
    setTitle(picked.name || fallbackName);
    setBody(picked.address);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    let ok: boolean;
    if (isLink) ok = await saveLink({ id: item.id, url, title, body: body || null });
    else if (isPlace) ok = await saveLocation({ id: item.id, name: title, address: body || null, place });
    else {
      ok = await save({
        id: item.id,
        title,
        body: body || null,
        ...(item.kind === "PALETTE" ? { colors } : {}),
        ...(item.kind === "GROUP" ? { groupColor } : {}),
      });
    }
    setSaving(false);
    if (ok) setEditingId(null);
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-3 px-1" data-testid="card-editor">
      {isLink && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`url-${item.id}`}>{t("linkUrl")}</Label>
          <Input
            id={`url-${item.id}`}
            // Text, not type="url": "pinterest.com/pin/1" without https:// is fine, the server adds it.
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            maxLength={2048}
            placeholder="https://"
            required
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
        </div>
      )}
      {isPlace && maps && <PlaceSearch onPick={pick} />}
      {isPlace && linked && (
        <p
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted px-3 py-2"
          data-testid="place-linked"
        >
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">{t("placeLinked")}</span>
          <button
            type="button"
            onClick={() => setPlace(null)}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("placeUnlink")}
          </button>
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`title-${item.id}`}>{isPlace ? t("placeName") : t("titleLabel")}</Label>
        <Input
          id={`title-${item.id}`}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={!isLink && !isPlace}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`body-${item.id}`}>{isPlace ? t("placeAddress") : t("bodyLabel")}</Label>
        <Textarea
          id={`body-${item.id}`}
          value={body}
          maxLength={isPlace ? 300 : 4000}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
        />
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColors((list) => [...list, "#888888"])}
              >
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
          {saving && isLink ? t("linkSaving") : t("save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
