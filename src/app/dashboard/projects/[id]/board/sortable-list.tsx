"use client";

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
import { createContext, useContext, type ReactNode } from "react";

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

const HandleContext = createContext<ReturnType<typeof useSortable> | null>(null);

/** One item of a SortableList. Put a <DragHandle> somewhere inside it. */
export function SortableItem({ id, children, testId }: { id: string; children: ReactNode; testId?: string }) {
  const sortable = useSortable({ id });
  return (
    <li
      ref={sortable.setNodeRef}
      data-testid={testId}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className={cn("min-w-0", sortable.isDragging && "relative z-10 opacity-80")}
    >
      <HandleContext.Provider value={sortable}>{children}</HandleContext.Provider>
    </li>
  );
}

export function DragHandle({ label }: { label: string }) {
  const sortable = useContext(HandleContext);
  if (!sortable) return null;
  return (
    <button
      type="button"
      ref={sortable.setActivatorNodeRef}
      aria-label={label}
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}
