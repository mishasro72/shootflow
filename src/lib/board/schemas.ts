import { z } from "zod";

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

/** Cards the feed can create in step 7a-2a; images, links and places come in 7a-2b. */
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
