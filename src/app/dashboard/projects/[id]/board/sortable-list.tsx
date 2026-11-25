"use client";

import { useId, type ReactNode } from "react";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { moveTo } from "@/lib/board/tree";
import { cn } from "@/lib/utils";

/**
 * A vertical list whose items can be dragged by a handle: with a finger, a mouse, or the
 * keyboard (Space to pick up, arrows to move, Space to drop). Only the handle starts a
 * drag, so the rest of the card scrolls the page as usual on a phone.
 */

type Props = {
  ids: string[];
  onReorder: (ids: string[]) => void;
  children: ReactNode;
};

export function SortableList({ ids, onReorder, children }: Props) {
  // dnd-kit numbers its accessibility ids with a global counter, which differs between the
  // server render and the browser. A stable id from React keeps both renders the same.
  const dndId = useId();
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a tap on the handle is just a tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(moveTo(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-3">{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

/**
 * One item of a SortableList. It makes the drag handle and gives it to `children`, which
 * puts it where it belongs in the card.
 */
export function SortableItem({
  id,
  handleLabel,
  testId,
  children,
}: {
  id: string;
  handleLabel: string;
  testId?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  // Only plain values and callbacks are taken out: the hook's result also holds the DOM
  // node itself, which must not be read while rendering.
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id,
  });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={handleLabel}
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      data-testid={testId}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("min-w-0", isDragging && "relative z-10 opacity-80")}
    >
      {children(handle)}
    </li>
  );
}
