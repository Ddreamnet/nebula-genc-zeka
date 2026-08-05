"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Shared drag-handle wiring — sortable-resource.tsx and sortable-topic.tsx
 *  each had identical useSortable + style-object boilerplate, differing only
 *  in the id/disabled they passed in. */
export function useSortableStyle(id: string, disabled: boolean) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return { attributes, listeners, setNodeRef, style, isDragging };
}
