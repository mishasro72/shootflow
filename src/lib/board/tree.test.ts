import { describe, expect, it } from "vitest";

import { buildFeed, flattenFeed, moveBy, moveTo, siblingIds, targetGroups, type BoardItem } from "./tree";

function item(id: string, patch: Partial<BoardItem> = {}): BoardItem {
  return {
    id,
    kind: "NOTE",
    group_role: null,
    group_color: null,
    parent_id: null,
    title: id,
    body: null,
    payload: {},
    sort_order: 0,
    status: null,
    visibility: "EVERYONE",
    in_shot_list: true,
    created_at: "2026-11-20T10:00:00Z",
    ...patch,
  };
}

describe("buildFeed", () => {
  it("orders the top level and each group's cards", () => {
    const feed = buildFeed([
      item("note", { sort_order: 2 }),
      item("look", { kind: "GROUP", group_role: "LOOK", sort_order: 1 }),
      item("b", { parent_id: "look", sort_order: 2 }),
      item("a", { parent_id: "look", sort_order: 1 }),
    ]);
    expect(feed.map((node) => node.id)).toEqual(["look", "note"]);
    expect(feed[0]?.children.map((child) => child.id)).toEqual(["a", "b"]);
    expect(feed[1]?.children).toEqual([]);
  });

  it("keeps the cards of a look that sits in a section", () => {
    const feed = buildFeed([
      item("section", { kind: "GROUP", group_role: "SECTION" }),
      item("look", { kind: "GROUP", group_role: "LOOK", parent_id: "section" }),
      item("note", { parent_id: "look" }),
    ]);
    expect(feed[0]?.children[0]?.children.map((child) => child.id)).toEqual(["note"]);
    expect(flattenFeed(feed).map((node) => node.id)).toEqual(["section", "look", "note"]);
    expect(siblingIds(feed, "look")).toEqual(["note"]);
    expect(siblingIds(feed, null)).toEqual(["section"]);
    expect(siblingIds(feed, "missing")).toEqual([]);
  });

  it("breaks ties by creation time", () => {
    const feed = buildFeed([
      item("later", { created_at: "2026-11-20T11:00:00Z" }),
      item("earlier", { created_at: "2026-11-20T09:00:00Z" }),
    ]);
    expect(feed.map((node) => node.id)).toEqual(["earlier", "later"]);
  });

  it("shows a card whose group is not on the board at the top level", () => {
    const feed = buildFeed([item("orphan", { parent_id: "trashed-group" })]);
    expect(feed.map((node) => node.id)).toEqual(["orphan"]);
  });
});

describe("moving", () => {
  it("moves one place up or down and stops at the ends", () => {
    expect(moveBy(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveBy(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveBy(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveBy(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
    expect(moveBy(["a", "b"], "missing", 1)).toEqual(["a", "b"]);
  });

  it("moves from one index to another", () => {
    expect(moveTo(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveTo(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveTo(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("targetGroups", () => {
  const items = [
    item("look", { kind: "GROUP", group_role: "LOOK", sort_order: 1 }),
    item("section", { kind: "GROUP", group_role: "SECTION", sort_order: 2 }),
    item("inner", { kind: "GROUP", group_role: "LOOK", parent_id: "section", sort_order: 1 }),
    item("note", { sort_order: 3 }),
  ];
  const feed = buildFeed(items);
  const ids = (list: BoardItem[]) => list.map((group) => group.id);

  it("offers every group to a card, except the one it is in", () => {
    expect(ids(targetGroups(feed, items[3] as BoardItem))).toEqual(["look", "section", "inner"]);
    expect(ids(targetGroups(feed, { ...(items[3] as BoardItem), parent_id: "look" }))).toEqual(["section", "inner"]);
  });

  it("offers a group only top-level sections", () => {
    expect(ids(targetGroups(feed, items[0] as BoardItem))).toEqual(["section"]);
    expect(ids(targetGroups(feed, items[2] as BoardItem))).toEqual([]);
  });

  it("does not nest a section that holds groups", () => {
    const withSecond = buildFeed([...items, item("s2", { kind: "GROUP", group_role: "SECTION", sort_order: 4 })]);
    expect(ids(targetGroups(withSecond, items[1] as BoardItem))).toEqual([]);
  });
});
