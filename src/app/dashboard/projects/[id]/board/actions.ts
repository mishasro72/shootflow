"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createCardSchema,
  DEFAULT_PALETTE,
  imageCardSchema,
  imageMeta,
  reorderSchema,
  updateCardSchema,
  visibilitySchema,
  type ImageCardInput,
  type UpdateCardInput,
} from "@/lib/board/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Board actions for the photographer. Every write goes through RLS (only the studio's own
 * projects), and the database checks the structure again in its triggers.
 */

export type BoardActionResult = { ok: true; id?: string } | { ok: false; error: "invalid" | "failed" };

const INVALID = { ok: false, error: "invalid" } as const;
const FAILED = { ok: false, error: "failed" } as const;

const idSchema = z.uuid();

function refresh(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}/board`);
  revalidatePath(`/dashboard/projects/${projectId}/board/trash`);
}

/** The next sort_order in a group (or at the top level), so a new card lands last. */
async function nextOrder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  parentId: string | null,
) {
  let query = supabase
    .from("board_items")
    .select("sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  const { data } = await query.maybeSingle();
  return (data?.sort_order ?? 0) + 1;
}

/** Adds an empty card of the given kind; the feed opens it for editing right away. */
export async function createBoardCard(input: z.input<typeof createCardSchema>): Promise<BoardActionResult> {
  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { projectId, parentId, kind } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project) return INVALID;

  const isGroup = kind === "LOOK" || kind === "SECTION";
  const { data, error } = await supabase
    .from("board_items")
    .insert({
      project_id: project.id,
      // Overwritten by a trigger from the project; required by the column.
      workspace_id: project.workspace_id,
      parent_id: parentId,
      kind: isGroup ? "GROUP" : kind,
      group_role: isGroup ? kind : null,
      payload: kind === "PALETTE" ? { colors: DEFAULT_PALETTE } : {},
      sort_order: await nextOrder(supabase, project.id, parentId),
    })
    .select("id")
    .single();
  if (error || !data) return error?.code === "23514" ? INVALID : FAILED;

  refresh(project.id);
  return { ok: true, id: data.id };
}

/**
 * A photo card from two finished BOARD uploads of this project (the 2048 px copy and the
 * thumbnail). The files are looked up through RLS, so another studio's ids are not found;
 * the database checks the keys again in its trigger. A card copied from Files remembers
 * that file, so the Files list can show "On the board" while the card lives.
 */
export async function createImageCard(input: ImageCardInput): Promise<BoardActionResult> {
  const parsed = imageCardSchema.safeParse(input);
  if (!parsed.success || parsed.data.imageId === parsed.data.thumbId) return INVALID;
  const { projectId, parentId, imageId, thumbId, title, width, height, palette, sourceFileId } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project) return INVALID;

  const { data: files } = await supabase
    .from("media_files")
    .select("id, object_key")
    .eq("project_id", project.id)
    .eq("purpose", "BOARD")
    .eq("status", "READY")
    .in("id", [imageId, thumbId]);
  const image = files?.find((file) => file.id === imageId);
  const thumb = files?.find((file) => file.id === thumbId);
  if (!image || !thumb) return INVALID;

  if (sourceFileId) {
    const { data: source } = await supabase
      .from("media_files")
      .select("id")
      .eq("id", sourceFileId)
      .eq("project_id", project.id)
      .eq("purpose", "FILE")
      .maybeSingle();
    if (!source) return INVALID;
  }

  const { data, error } = await supabase
    .from("board_items")
    .insert({
      project_id: project.id,
      workspace_id: project.workspace_id,
      parent_id: parentId,
      kind: "IMAGE",
      title,
      image_key: image.object_key,
      thumb_key: thumb.object_key,
      payload: { width, height, palette, ...(sourceFileId ? { source_file_id: sourceFileId } : {}) },
      sort_order: await nextOrder(supabase, project.id, parentId),
    })
    .select("id")
    .single();
  if (error || !data) return error?.code === "23514" ? INVALID : FAILED;

  refresh(project.id);
  if (sourceFileId) revalidatePath(`/dashboard/projects/${project.id}`);
  return { ok: true, id: data.id };
}

/** A palette card with the colours found in a photo, placed right after the photo. */
export async function createPaletteFromImage(id: string): Promise<BoardActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return INVALID;

  const supabase = await createSupabaseServerClient();
  const { data: image } = await supabase
    .from("board_items")
    .select("id, project_id, workspace_id, parent_id, title, payload")
    .eq("id", parsedId.data)
    .eq("kind", "IMAGE")
    .is("deleted_at", null)
    .maybeSingle();
  const colors = imageMeta(image?.payload)?.palette ?? [];
  if (!image || colors.length === 0) return INVALID;

  const t = await getTranslations("Board");
  const { data: palette, error } = await supabase
    .from("board_items")
    .insert({
      project_id: image.project_id,
      workspace_id: image.workspace_id,
      parent_id: image.parent_id,
      kind: "PALETTE",
      title: t("paletteTitle", { title: image.title || t("untitled") }).slice(0, 200),
      payload: { colors },
      sort_order: await nextOrder(supabase, image.project_id, image.parent_id),
    })
    .select("id")
    .single();
  if (error || !palette) return FAILED;

  // It was added last; move it up to sit just below the photo.
  let query = supabase
    .from("board_items")
    .select("id")
    .eq("project_id", image.project_id)
    .is("deleted_at", null)
    .order("sort_order")
    .order("created_at");
  query = image.parent_id ? query.eq("parent_id", image.parent_id) : query.is("parent_id", null);
  const { data: siblings } = await query;
  const ids = (siblings ?? []).map((row) => row.id).filter((rowId) => rowId !== palette.id);
  ids.splice(ids.indexOf(image.id) + 1, 0, palette.id);
  await Promise.all(
    ids.map((rowId, index) =>
      supabase
        .from("board_items")
        .update({ sort_order: index + 1 })
        .eq("id", rowId),
    ),
  );

  refresh(image.project_id);
  return { ok: true, id: palette.id };
}

/** Saves the title and text of a card, and the colours of a palette or a group. */
export async function updateBoardCard(input: UpdateCardInput): Promise<BoardActionResult> {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { id, title, body, colors, groupColor } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: card } = await supabase
    .from("board_items")
    .select("id, project_id, kind, payload")
    .eq("id", id)
    .maybeSingle();
  if (!card) return INVALID;

  const patch: {
    title: string;
    body: string | null;
    payload?: { colors: string[] };
    group_color?: string | null;
  } = { title, body: body || null };
  if (card.kind === "PALETTE" && colors) patch.payload = { ...(card.payload as object), colors };
  if (card.kind === "GROUP" && groupColor !== undefined) patch.group_color = groupColor;

  const { error } = await supabase.from("board_items").update(patch).eq("id", card.id);
  if (error) return FAILED;

  refresh(card.project_id);
  return { ok: true };
}

/** Who may see a card: everyone, the team (not the client), or only the studio. */
export async function setBoardCardVisibility(id: string, visibility: string): Promise<BoardActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsedVisibility = visibilitySchema.safeParse(visibility);
  if (!parsedId.success || !parsedVisibility.success) return INVALID;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_items")
    .update({ visibility: parsedVisibility.data })
    .eq("id", parsedId.data)
    .select("project_id")
    .maybeSingle();
  if (error || !data) return FAILED;

  refresh(data.project_id);
  return { ok: true };
}

/** "In shot list": whether a look or an image becomes a shot on the shoot day. */
export async function setBoardCardInShotList(id: string, inShotList: boolean): Promise<BoardActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success || typeof inShotList !== "boolean") return INVALID;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_items")
    .update({ in_shot_list: inShotList })
    .eq("id", parsedId.data)
    .select("project_id")
    .maybeSingle();
  if (error || !data) return FAILED;

  refresh(data.project_id);
  return { ok: true };
}

/**
 * Saves a new order for one list: the top level or the cards of one group. Every id must
 * already be in that list; the order becomes 1, 2, 3...
 */
export async function reorderBoardCards(input: z.input<typeof reorderSchema>): Promise<BoardActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { projectId, parentId, ids } = parsed.data;
  if (new Set(ids).size !== ids.length) return INVALID;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("board_items")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .in("id", ids);
  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  const { data: found } = await query;
  if (!found || found.length !== ids.length) return INVALID;

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("board_items")
        .update({ sort_order: index + 1 })
        .eq("id", id),
    ),
  );
  if (results.some((result) => result.error)) return FAILED;

  refresh(projectId);
  return { ok: true };
}

/** Moves a card into a group, or out to the top level with `parentId` null; it lands last. */
export async function moveBoardCard(id: string, parentId: string | null): Promise<BoardActionResult> {
  const parsedId = idSchema.safeParse(id);
  const parsedParent = idSchema.nullable().safeParse(parentId);
  if (!parsedId.success || !parsedParent.success) return INVALID;

  const supabase = await createSupabaseServerClient();
  const { data: card } = await supabase
    .from("board_items")
    .select("id, project_id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!card) return INVALID;

  const { error } = await supabase
    .from("board_items")
    .update({ parent_id: parsedParent.data, sort_order: await nextOrder(supabase, card.project_id, parsedParent.data) })
    .eq("id", card.id);
  // 23514: the database refused the structure (for example, a group into a Look).
  if (error) return error.code === "23514" ? INVALID : FAILED;

  refresh(card.project_id);
  return { ok: true };
}

/** Moves a card to the trash; a group takes its cards along. Restorable for 30 days. */
export async function trashBoardCard(id: string): Promise<BoardActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return INVALID;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .is("deleted_at", null)
    .select("project_id")
    .maybeSingle();
  if (error || !data) return FAILED;

  refresh(data.project_id);
  return { ok: true };
}

/**
 * Brings a card back from the trash, at the end of its list. A card whose group is still
 * in the trash comes back at the top level, so it is not hidden inside a deleted group.
 */
export async function restoreBoardCard(id: string): Promise<void> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: card } = await supabase
    .from("board_items")
    .select("id, project_id, parent_id, deleted_at")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!card?.deleted_at) return;

  let parentId = card.parent_id;
  if (parentId) {
    const { data: parent } = await supabase.from("board_items").select("deleted_at").eq("id", parentId).maybeSingle();
    if (!parent || parent.deleted_at) parentId = null;
  }

  await supabase
    .from("board_items")
    .update({ deleted_at: null, parent_id: parentId, sort_order: await nextOrder(supabase, card.project_id, parentId) })
    .eq("id", card.id);
  refresh(card.project_id);
}
