"use client";

import { Button } from "@/components/panel-ui/button";
import { ExternalLink, Pencil, Trash2, GripVertical } from "lucide-react";
import { getResourceIcon } from "@/lib/admin/resource-icon";
import { useSortableStyle } from "./use-sortable-style";

interface GlobalTopicResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  order_index: number;
}

interface SortableResourceProps {
  resource: GlobalTopicResource;
  isAdmin: boolean;
  onEditResource: (resource: GlobalTopicResource) => void;
  onDeleteResource: (resourceId: string) => void;
}

export function SortableResource({ resource, isAdmin, onEditResource, onDeleteResource }: SortableResourceProps) {
  const { attributes, listeners, setNodeRef, style } = useSortableStyle(resource.id, !isAdmin);

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 bg-accent/30 rounded-md">
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
        {isAdmin && (
          <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Sürükle" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-shrink-0">{getResourceIcon(resource.resource_type)}</div>
        <div className="flex-1 cursor-pointer min-w-0" onClick={() => window.open(resource.resource_url, "_blank", "noopener,noreferrer")}>
          <p className="font-medium text-sm hover:text-primary transition-colors truncate">{resource.title}</p>
          {resource.description && <p className="text-xs text-muted-foreground truncate">{resource.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-auto sm:ml-0">
        {isAdmin && (
          <>
            <Button size="sm" variant="ghost" aria-label="Kaynağı düzenle" onClick={() => onEditResource(resource)} className="h-7 w-7 p-0">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" aria-label="Kaynağı sil" onClick={() => onDeleteResource(resource.id)} className="h-7 w-7 p-0">
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" aria-label="Aç" onClick={() => window.open(resource.resource_url, "_blank", "noopener,noreferrer")} className="h-7 w-7 p-0">
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
