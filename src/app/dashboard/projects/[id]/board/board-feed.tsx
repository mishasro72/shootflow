"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, useTransition } from "react";

import type { NewCardKind, UpdateCardInput } from "@/lib/board/schemas";
import { buildFeed, moveBy, siblingIds, type BoardItem, type FeedNode } from "@/lib/board/tree";

import {
  createBoardCard,
  moveBoardCard,
  reorderBoardCards,
  setBoardCardInShotList,
  setBoardCardVisibility,
  trashBoardCard,
  updateBoardCard,
  type BoardActionResult,
} from "./actions";
import { AddMenu } from "./add-menu";
import { BoardCard } from "./board-card";
import { SortableItem, SortableList } from "./sortable-list";

/** Everything a card needs to change the board, shared through context. */
type BoardApi = {
  feed: FeedNode[];
  pending: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  add: (kind: NewCardKind, parentId: string | null) => void;
  save: (input: UpdateCardInput) => Promise<boolean>;
  reorder: (parentId: string | null, ids: string[]) => void;
  step: (item: BoardItem, by: number) => void;
  move: (item: BoardItem, parentId: string | null) => void;
  setVisibility: (item: BoardItem, visibility: string) => void;
  setInShotList: (item: BoardItem, value: boolean) => void;
  trash: (item: BoardItem) => void;
};

const BoardContext = createContext<BoardApi | null>(null);

export function useBoard(): BoardApi {
  const api = useContext(BoardContext);
  if (!api) throw new Error("useBoard outside BoardFeed");
  return api;
}

/**
 * The board as a feed (phone first, works on desktop too). The server sends the cards;
 * this component keeps a local copy so drags and arrows move cards at once, then saves.
 * After every save the server sends the board again and the copy is replaced.
 */
export function BoardFeed({ projectId, items }: { projectId: string; items: BoardItem[] }) {
  const t = useTranslations("Board");
  const router = useRouter();
  const [local, setLocal] = useState(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<"invalid" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();

  // A fresh board from the server replaces the local copy. Comparing with the previous
  // props during render (instead of in an effect) avoids an extra render with stale cards.
  const [serverItems, setServerItems] = useState(items);
  if (items !== serverItems) {
    setServerItems(items);
    setLocal(items);
  }

  const feed = useMemo(() => buildFeed(local), [local]);

  /** Runs an action; on failure shows the error and reloads the real board. */
  function run(action: () => Promise<BoardActionResult>, after?: (result: BoardActionResult & { ok: true }) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) after?.(result);
      else {
        setError(result.error);
        router.refresh();
      }
    });
  }

  /** Writes a new order into the local copy right away. */
  function applyOrder(ids: string[]) {
    const order = new Map(ids.map((id, index) => [id, index + 1]));
    setLocal((list) => list.map((item) => (order.has(item.id) ? { ...item, sort_order: order.get(item.id) ?? 0 } : item)));
  }

  const api: BoardApi = {
    feed,
    pending,
    editingId,
    setEditingId,
    add: (kind, parentId) =>
      run(
        () => createBoardCard({ projectId, parentId, kind }),
        (result) => setEditingId(result.id ?? null),
      ),
    save: async (input) => {
      setError(null);
      const result = await updateBoardCard(input);
      if (!result.ok) setError(result.error);
      return result.ok;
    },
    reorder: (parentId, ids) => {
      applyOrder(ids);
      run(() => reorderBoardCards({ projectId, parentId, ids }));
    },
    step: (item, by) => {
      const ids = moveBy(siblingIds(feed, item.parent_id), item.id, by);
      api.reorder(item.parent_id, ids);
    },
    move: (item, parentId) => run(() => moveBoardCard(item.id, parentId)),
    setVisibility: (item, visibility) => run(() => setBoardCardVisibility(item.id, visibility)),
    setInShotList: (item, value) => run(() => setBoardCardInShotList(item.id, value)),
    trash: (item) => run(() => trashBoardCard(item.id)),
  };

  return (
    <BoardContext.Provider value={api}>
      <div className="flex flex-col gap-4" aria-busy={pending}>
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
            {t(`errors.${error}`)}
          </p>
        )}

        {feed.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <SortableList ids={feed.map((node) => node.id)} onReorder={(ids) => api.reorder(null, ids)}>
            {feed.map((node) => (
              <SortableItem
                key={node.id}
                id={node.id}
                testId="board-card"
                handleLabel={t("dragHandle", { title: node.title || t("untitled") })}
              >
                {(handle) => (
                  <BoardCard item={node} handle={handle}>
                    {node.kind === "GROUP" && <GroupChildren group={node} />}
                  </BoardCard>
                )}
              </SortableItem>
            ))}
          </SortableList>
        )}

        <AddMenu parentId={null} variant="primary" />
      </div>
    </BoardContext.Provider>
  );
}

/** The cards inside a group, sortable among themselves, and a button to add more. */
function GroupChildren({ group }: { group: FeedNode }) {
  const t = useTranslations("Board");
  const { reorder } = useBoard();
  return (
    <div className="mt-3 flex flex-col gap-3 border-t pt-3">
      {group.children.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyGroup")}</p>
      ) : (
        <SortableList ids={group.children.map((child) => child.id)} onReorder={(ids) => reorder(group.id, ids)}>
          {group.children.map((child) => (
            <SortableItem
              key={child.id}
              id={child.id}
              testId="board-card"
              handleLabel={t("dragHandle", { title: child.title || t("untitled") })}
            >
              {(handle) => (
                <BoardCard item={child} handle={handle}>
                  {child.kind === "GROUP" && <GroupChildren group={child} />}
                </BoardCard>
              )}
            </SortableItem>
          ))}
        </SortableList>
      )}
      <AddMenu parentId={group.id} variant="inline" allowLook={group.group_role === "SECTION" && !group.parent_id} />
    </div>
  );
}
