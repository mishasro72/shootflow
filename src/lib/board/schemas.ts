import { z } from "zod";

import { BOARD_IMAGE_PX } from "@/lib/images/fit";

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

/** Empty cards the "Add" menu creates; photos come through `imageCardSchema`, links and places in 7a-2b-2. */
export const newCardKindSchema = z.enum(["LOOK", "SECTION", "NOTE", "PALETTE"]);
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
