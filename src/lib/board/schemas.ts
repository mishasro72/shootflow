import { z } from "zod";

import { BOARD_IMAGE_PX } from "@/lib/images/fit";
import { MAX_URL_LENGTH } from "@/lib/links/preview";
import { placeIdSchema } from "@/lib/places/schemas";

/**
 * What the board's server actions accept. The database checks the structure again
 * (triggers in 20261110000200_board_items.sql); these rules give the photographer a
 * clear answer before anything is written.
 */

export const MAX_PALETTE_COLORS = 8;

export const hexColorSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/);

export const paletteSchema = z.array(hexColorSchema).min(1).max(MAX_PALETTE_COLORS);

export const visibilitySchema = z.enum(["EVERYONE", "TEAM", "PRIVATE"]);

/**
 * Empty cards the "Add" menu creates; the editor opens at once. Photos come through
 * `imageCardSchema`; a link or a place is filled in by its own save action.
 */
export const newCardKindSchema = z.enum(["LOOK", "SECTION", "NOTE", "PALETTE", "LINK", "LOCATION"]);
export type NewCardKind = z.infer<typeof newCardKindSchema>;

export const createCardSchema = z.object({
  projectId: z.uuid(),
  parentId: z.uuid().nullable(),
  kind: newCardKindSchema,
});

export const updateCardSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().max(200),
  body: z.string().trim().max(4000).nullable(),
  /** Palettes only. */
  colors: paletteSchema.optional(),
  /** Groups only. */
  groupColor: hexColorSchema.nullable().optional(),
});
export type UpdateCardInput = z.input<typeof updateCardSchema>;

/**
 * A photo card, after the browser uploaded its two copies (2048 px and 400 px) as BOARD
 * files. The size and main colours come from the browser too; they are only display hints.
 */
export const imageCardSchema = z.object({
  projectId: z.uuid(),
  parentId: z.uuid().nullable(),
  imageId: z.uuid(),
  thumbId: z.uuid(),
  title: z.string().trim().max(200),
  width: z.number().int().positive().max(BOARD_IMAGE_PX),
  height: z.number().int().positive().max(BOARD_IMAGE_PX),
  palette: z.array(hexColorSchema).max(MAX_PALETTE_COLORS),
  /** Set by "To board" in Files: the file the photo was copied from. */
  sourceFileId: z.uuid().optional(),
});
export type ImageCardInput = z.input<typeof imageCardSchema>;

/** A link card: the address the photographer pasted, plus the usual title and text. */
export const linkCardSchema = z.object({
  id: z.uuid(),
  url: z.string().trim().max(MAX_URL_LENGTH),
  title: z.string().trim().max(200),
  body: z.string().trim().max(4000).nullable(),
});
export type LinkCardInput = z.input<typeof linkCardSchema>;

/** A place picked in Google search: its id, coordinates and time zone. */
export const pickedPlaceSchema = z.object({
  placeId: placeIdSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timeZone: z.string().max(64).nullable(),
});

/**
 * A place card. `place`: a newly picked Google place, null to unlink it (a place typed by
 * hand), or left out to keep the one the card has (renaming must not count as a new sync).
 */
export const locationCardSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().max(200),
  address: z.string().trim().max(300).nullable(),
  place: pickedPlaceSchema.nullable().optional(),
});
export type LocationCardInput = z.input<typeof locationCardSchema>;

export const reorderSchema = z.object({
  projectId: z.uuid(),
  parentId: z.uuid().nullable(),
  ids: z.array(z.uuid()).min(1).max(500),
});

/** Default colours for a new palette: warm neutrals that read well in both themes. */
export const DEFAULT_PALETTE = ["#e8dcc8", "#c9a27e", "#8c6a4f", "#3f3a36"];

/** Reads palette colours from a card's payload, ignoring anything malformed. */
export function paletteColors(payload: unknown): string[] {
  const colors = (payload as { colors?: unknown } | null)?.colors;
  const parsed = paletteSchema.safeParse(colors);
  return parsed.success ? parsed.data : [];
}

/**
 * What a photo card keeps in its payload: its size and the colours found in it, and the
 * Files item it was copied from (`source_file_id`), read by the Files list.
 */
export type ImageMeta = { width: number; height: number; palette: string[] };

const imageMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  palette: z.array(hexColorSchema).max(MAX_PALETTE_COLORS).catch([]),
});

/** Reads a photo card's payload; null if there is nothing usable. */
export function imageMeta(payload: unknown): ImageMeta | null {
  const parsed = imageMetaSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** A photo's name without its extension, as the card's first title ("IMG_2041.HEIC" → "IMG_2041"). */
export function titleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .trim()
    .slice(0, 200);
}

/** What a link card keeps in its payload. */
export type LinkMeta = { url: string; site: string; description: string | null };

const linkMetaSchema = z.object({
  url: z.string(),
  site: z.string(),
  description: z.string().nullable().catch(null),
});

/** Reads a link card's payload; null until an address has been saved. */
export function linkMeta(payload: unknown): LinkMeta | null {
  const parsed = linkMetaSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/**
 * What a place card keeps in its payload: the Google place (kept as long as we like) and
 * its coordinates with their sync time (at most 30 days, Google's terms), and time zone.
 */
export type PlaceMeta = {
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  syncedAt: string | null;
  timeZone: string | null;
};

const placeMetaSchema = z
  .object({
    place_id: z.string().optional().catch(undefined),
    lat: z.number().optional().catch(undefined),
    lng: z.number().optional().catch(undefined),
    synced_at: z.string().optional().catch(undefined),
    timezone: z.string().optional().catch(undefined),
  })
  .catch({});

/** Reads a place card's payload; every part may be missing (a place typed by hand has none). */
export function placeMeta(payload: unknown): PlaceMeta {
  const data = placeMetaSchema.parse(payload);
  return {
    placeId: data.place_id ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    syncedAt: data.synced_at ?? null,
    timeZone: data.timezone ?? null,
  };
}
