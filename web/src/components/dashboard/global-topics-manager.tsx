"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Card, CardContent } from "@/components/panel-ui/card";
import { Button } from "@/components/panel-ui/button";
import { Switch } from "@/components/panel-ui/switch";
import { Label } from "@/components/panel-ui/label";
import { BookOpen, Plus } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { clearGlobalTopicsCache } from "@/lib/lesson/global-topics-cache";
import { SortableTopic } from "./sortable-topic";
import { AddTopicDialog } from "./admin/add-topic-dialog";
import { AddResourceDialog } from "./admin/add-resource-dialog";
import { EditTopicDialog } from "./admin/edit-topic-dialog";
import { EditResourceDialog } from "./admin/edit-resource-dialog";

interface GlobalTopicResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  order_index: number;
}

interface GlobalTopic {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  resources: GlobalTopicResource[];
}

interface GlobalTopicsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

export function GlobalTopicsManager({ open, onOpenChange, isAdmin = false }: GlobalTopicsManagerProps) {
  const [globalTopics, setGlobalTopics] = useState<GlobalTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showEditTopic, setShowEditTopic] = useState(false);
  const [showEditResource, setShowEditResource] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [editingTopic, setEditingTopic] = useState<GlobalTopic | null>(null);
  const [editingResource, setEditingResource] = useState<GlobalTopicResource | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  // Fetched once per mount, not on every open — reopening the dialog after
  // it's already loaded shouldn't flash a spinner over data we already have.
  // Mutations (add/edit/delete/reorder) still call fetchGlobalTopics()
  // directly afterward, so the list stays correct.
  const loadedRef = useRef(false);

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      fetchGlobalTopics();
    }
  }, [open]);

  async function fetchGlobalTopics() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("global_topics")
      .select("*, global_topic_resources(*)")
      .order("order_index", { ascending: true })
      .order("order_index", { foreignTable: "global_topic_resources", ascending: true });

    if (error) {
      toast.error("Global konular getirilemedi");
      setLoading(false);
      return;
    }

    setGlobalTopics(
      (data ?? []).map((topic) => ({
        ...topic,
        resources: (topic.global_topic_resources ?? []).sort((a: GlobalTopicResource, b: GlobalTopicResource) => a.order_index - b.order_index),
      })),
    );
    setLoading(false);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function handleTopicDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = globalTopics.findIndex((t) => t.id === active.id);
    const newIndex = globalTopics.findIndex((t) => t.id === over.id);
    const newTopics = arrayMove(globalTopics, oldIndex, newIndex);
    setGlobalTopics(newTopics);

    const supabase = createClient();
    const topicOrders = newTopics.map((topic, index) => ({ id: topic.id, order_index: index }));
    const { error } = await supabase.rpc("update_global_topics_order", { topic_orders: topicOrders });
    if (error) {
      toast.error("Sıra güncellenemedi");
      fetchGlobalTopics();
    } else {
      clearGlobalTopicsCache();
    }
  }

  async function handleResourceDragEnd(event: DragEndEvent, topicId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const topic = globalTopics.find((t) => t.id === topicId);
    if (!topic) return;

    const oldIndex = topic.resources.findIndex((r) => r.id === active.id);
    const newIndex = topic.resources.findIndex((r) => r.id === over.id);
    const newResources = arrayMove(topic.resources, oldIndex, newIndex);
    setGlobalTopics(globalTopics.map((t) => (t.id === topicId ? { ...t, resources: newResources } : t)));

    const supabase = createClient();
    const resourceOrders = newResources.map((resource, index) => ({ id: resource.id, order_index: index }));
    const { error } = await supabase.rpc("update_global_resources_order", { resource_orders: resourceOrders });
    if (error) {
      toast.error("Kaynak sırası güncellenemedi");
      fetchGlobalTopics();
    } else {
      clearGlobalTopicsCache();
    }
  }

  async function handleAddTopic(title: string, description: string, addToEnd = false) {
    const supabase = createClient();
    try {
      let orderIndex = 0;
      if (addToEnd) {
        const { data: lastTopic, error: fetchError } = await supabase
          .from("global_topics")
          .select("order_index")
          .order("order_index", { ascending: false })
          .limit(1);
        if (fetchError) throw fetchError;
        orderIndex = lastTopic && lastTopic.length > 0 ? lastTopic[0].order_index + 1 : 0;
      } else {
        const { data: existingTopics, error: fetchError } = await supabase.from("global_topics").select("id, order_index");
        if (fetchError) throw fetchError;
        if (existingTopics && existingTopics.length > 0) {
          // Reuse the same batch RPC the drag-reorder path already uses
          // (line ~96) instead of N individual unchecked updates — one
          // round trip instead of N, and errors actually surface instead of
          // silently leaving a duplicate order_index.
          const shiftedOrders = existingTopics.map((t) => ({ id: t.id, order_index: t.order_index + 1 }));
          const { error: reorderError } = await supabase.rpc("update_global_topics_order", { topic_orders: shiftedOrders });
          if (reorderError) throw reorderError;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      const { error } = await supabase.from("global_topics").insert({ teacher_id: user.id, title, description: description || null, order_index: orderIndex });
      if (error) throw error;

      toast.success("Global konu başarıyla eklendi");
      clearGlobalTopicsCache();
      fetchGlobalTopics();
      setShowAddTopic(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konu eklenemedi");
    }
  }

  async function handleDeleteTopic(topicId: string) {
    const supabase = createClient();
    try {
      const { error: resourcesError } = await supabase.from("global_topic_resources").delete().eq("global_topic_id", topicId);
      if (resourcesError) throw resourcesError;

      const { error } = await supabase.from("global_topics").delete().eq("id", topicId);
      if (error) throw error;

      toast.success("Global konu başarıyla silindi");
      clearGlobalTopicsCache();
      fetchGlobalTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konu silinemedi");
    }
  }

  async function handleAddResource(title: string, description: string, resourceType: string, resourceUrl: string) {
    const supabase = createClient();
    try {
      const currentTopic = globalTopics.find((t) => t.id === selectedTopicId);
      const nextOrderIndex = currentTopic?.resources.length ?? 0;

      const { error } = await supabase.from("global_topic_resources").insert({
        global_topic_id: selectedTopicId,
        title,
        description: description || null,
        resource_type: resourceType,
        resource_url: resourceUrl,
        order_index: nextOrderIndex,
      });
      if (error) throw error;

      toast.success("Kaynak başarıyla eklendi");
      clearGlobalTopicsCache();
      fetchGlobalTopics();
      setShowAddResource(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak eklenemedi");
    }
  }

  async function handleEditTopic(id: string, title: string, description: string) {
    const supabase = createClient();
    try {
      const { error } = await supabase.from("global_topics").update({ title, description: description || null }).eq("id", id);
      if (error) throw error;

      toast.success("Konu başarıyla güncellendi");
      clearGlobalTopicsCache();
      fetchGlobalTopics();
      setShowEditTopic(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konu güncellenemedi");
    }
  }

  async function handleEditResource(id: string, title: string, description: string, resourceType: string, resourceUrl: string) {
    const supabase = createClient();
    try {
      const { error } = await supabase.from("global_topic_resources").update({ title, description: description || null, resource_type: resourceType, resource_url: resourceUrl }).eq("id", id);
      if (error) throw error;

      toast.success("Kaynak başarıyla güncellendi");
      clearGlobalTopicsCache();
      fetchGlobalTopics();
      setShowEditResource(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak güncellenemedi");
    }
  }

  async function handleDeleteResource(resourceId: string) {
    const supabase = createClient();
    try {
      const { error } = await supabase.from("global_topic_resources").delete().eq("id", resourceId);
      if (error) throw error;

      toast.success("Kaynak başarıyla silindi");
      clearGlobalTopicsCache();
      fetchGlobalTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak silinemedi");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              Global Konular Yönetimi
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-xs sm:text-sm text-muted-foreground">{isAdmin ? "Herhangi bir öğrenciye atanabilecek global konuları yönetin" : "Global konular ve kaynaklar"}</p>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  {!loading && globalTopics.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Switch id="expand-all" checked={expandAll} onCheckedChange={setExpandAll} />
                      <Label htmlFor="expand-all" className="cursor-pointer text-xs sm:text-sm">
                        Tümünü Aç
                      </Label>
                    </div>
                  )}
                  {isAdmin && (
                    <Button onClick={() => setShowAddTopic(true)} size="sm" className="text-xs sm:text-sm">
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      Konu Ekle
                    </Button>
                  )}
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}

              {!loading && globalTopics.length === 0 && (
                <Card className="text-center py-8">
                  <CardContent>
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Henüz Global Konu Yok</h3>
                    <p className="text-muted-foreground mb-4">{isAdmin ? "Herhangi bir öğrenciye atanabilecek yeniden kullanılabilir konular oluşturun." : "Henüz hiç global konu eklenmemiş."}</p>
                    {isAdmin && (
                      <Button onClick={() => setShowAddTopic(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk Konunuzu Ekleyin
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {!loading && globalTopics.length > 0 && (
                <DndContext sensors={isAdmin ? sensors : []} collisionDetection={closestCenter} onDragEnd={isAdmin ? handleTopicDragEnd : undefined}>
                  <SortableContext items={globalTopics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {globalTopics.map((topic) => (
                        <SortableTopic
                          key={topic.id}
                          topic={topic}
                          isAdmin={isAdmin}
                          expandAll={expandAll}
                          onAddResource={(topicId) => {
                            setSelectedTopicId(topicId);
                            setShowAddResource(true);
                          }}
                          onEditTopic={(topic) => {
                            setEditingTopic(topic);
                            setShowEditTopic(true);
                          }}
                          onDeleteTopic={handleDeleteTopic}
                          onEditResource={(resource) => {
                            setEditingResource(resource);
                            setShowEditResource(true);
                          }}
                          onDeleteResource={handleDeleteResource}
                          onResourceDragEnd={handleResourceDragEnd}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddTopicDialog open={showAddTopic} onOpenChange={setShowAddTopic} onAddTopic={handleAddTopic} allowAddToEnd />
      <AddResourceDialog open={showAddResource} onOpenChange={setShowAddResource} topicId={selectedTopicId} topicTitle={globalTopics.find((t) => t.id === selectedTopicId)?.title} onAddResource={handleAddResource} />
      <EditTopicDialog open={showEditTopic} onOpenChange={setShowEditTopic} onEditTopic={handleEditTopic} topic={editingTopic} />
      <EditResourceDialog open={showEditResource} onOpenChange={setShowEditResource} onEditResource={handleEditResource} resource={editingResource} />
    </>
  );
}
