/**
 * The board feed is a list of top-level cards; a group carries its own list of cards.
 * The database stores a flat list with parent_id and sort_order; these helpers turn it
 * into the feed and compute new orders. No React or database here, so they are easy to test.
 */

export type BoardKind = "GROUP" | "IMAGE" | "PALETTE" | "NOTE" | "LINK" | "LOCATION";
export type GroupRole = "LOOK" | "SECTION";
export type Visibility = "EVERYONE" | "TEAM" | "PRIVATE";
export type ReviewStatus = "PENDING" | "APPROVED" | "CHANGES_REQUESTED";

/** The columns the feed needs. */
export type BoardItem = {
  id: string;
  kind: BoardKind;
  group_role: GroupRole | null;
  group_color: string | null;
  parent_id: string | null;
  title: string;
  body: string | null;
  payload: unknown;
  sort_order: number;
  status: ReviewStatus | null;
  visibility: Visibility;
  in_shot_list: boolean;
  created_at: string;
};

export type FeedNode = BoardItem & { children: FeedNode[] };

const byOrder = (a: BoardItem, b: BoardItem) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

/**
 * Top-level cards in order, each group with its cards in order (a Look inside a Section
 * has its own cards). A card whose group is not in the list (for example, restored while
 * its group is still in the trash) is shown at the top level, so nothing live is hidden.
 */
export function buildFeed(items: BoardItem[]): FeedNode[] {
  const ids = new Set(items.map((item) => item.id));
  const children = new Map<string, BoardItem[]>();
  const top: BoardItem[] = [];

  for (const item of items) {
    if (item.parent_id && ids.has(item.parent_id)) {
      const list = children.get(item.parent_id) ?? [];
      list.push(item);
      children.set(item.parent_id, list);
    } else {
      top.push(item);
    }
  }

  const grow = (item: BoardItem): FeedNode => ({
    ...item,
    children: (children.get(item.id) ?? []).sort(byOrder).map(grow),
  });
  return top.sort(byOrder).map(grow);
}

/** Every card of the feed, in feed order (a group before its cards). */
export function flattenFeed(feed: FeedNode[]): FeedNode[] {
  return feed.flatMap((node) => [node, ...flattenFeed(node.children)]);
}

/** The ids of one list: the top level (`parentId` null) or the cards of one group. */
export function siblingIds(feed: FeedNode[], parentId: string | null): string[] {
  if (!parentId) return feed.map((node) => node.id);
  return (
    flattenFeed(feed)
      .find((node) => node.id === parentId)
      ?.children.map((child) => child.id) ?? []
  );
}

/** The same ids with one moved `by` places (−1 up, +1 down), clamped to the list. */
export function moveBy(ids: string[], id: string, by: number): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return ids;
  const to = Math.min(Math.max(from + by, 0), ids.length - 1);
  return moveTo(ids, from, to);
}

/** The same ids with the one at `from` moved to `to`. */
export function moveTo(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as string);
  return next;
}

/** Groups a card may move into: a group never goes into a Look, and only into a top-level Section. */
export function targetGroups(feed: FeedNode[], item: BoardItem): BoardItem[] {
  const all = flattenFeed(feed);
  if (item.kind !== "GROUP") {
    return all.filter((node) => node.kind === "GROUP" && node.id !== item.parent_id);
  }

  const holdsGroups = all.some((node) => node.id === item.id && node.children.some((c) => c.kind === "GROUP"));
  if (holdsGroups) return [];
  return feed.filter(
    (node) =>
      node.kind === "GROUP" && node.group_role === "SECTION" && node.id !== item.id && node.id !== item.parent_id,
  );
}
