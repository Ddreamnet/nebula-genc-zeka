"use client";

import { Card, CardContent } from "@/components/panel-ui/card";
import { Button } from "@/components/panel-ui/button";
import { Badge } from "@/components/panel-ui/badge";
import { Checkbox } from "@/components/panel-ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/panel-ui/collapsible";
import { ChevronRight, Plus, Trash2, Settings } from "lucide-react";
import { getResourceIcon } from "@/lib/admin/resource-icon";
import type { Topic, Resource } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

interface StudentTopicsSectionProps {
  studentId: string;
  studentUserId: string;
  studentTopics: Topic[];
  completedTopics: Topic[];
  onAddTopic: (studentId: string) => void;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: Topic) => void;
  onEditResource: (resource: Resource) => void;
  onDeleteTopic: (topicId: string, studentId: string, studentUserId: string) => void;
  onDeleteResource: (resourceId: string, studentId: string, studentUserId: string) => void;
}

export function StudentTopicsSection({
  studentId,
  studentUserId,
  studentTopics,
  completedTopics,
  onAddTopic,
  onAddResource,
  onEditTopic,
  onEditResource,
  onDeleteTopic,
  onDeleteResource,
}: StudentTopicsSectionProps) {
  const topicsWithCompletedResources = completedTopics.filter((t) => t.resources.some((r) => r.is_completed));
  const fullyCompletedCount = topicsWithCompletedResources.filter((t) => t.is_completed).length;
  const totalCompletedResources = topicsWithCompletedResources.reduce(
    (sum, t) => sum + t.resources.filter((r) => r.is_completed).length,
    0,
  );

  return (
    <div className="pl-6 border-t pt-3 space-y-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h5 className="font-medium text-sm">İşlenen Konular</h5>
          <Badge variant="secondary">
            {totalCompletedResources} kaynak işlendi ({fullyCompletedCount} konu tam)
          </Badge>
        </div>

        {topicsWithCompletedResources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Henüz işlenmiş kaynak yok.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {topicsWithCompletedResources.map((topic) => {
              const completedResourcesCount = topic.resources.filter((r) => r.is_completed).length;
              const totalResourcesCount = topic.resources.length;
              const isFullyCompleted = topic.is_completed || completedResourcesCount === totalResourcesCount;

              return (
                <Card
                  key={topic.id}
                  className={cn(
                    "border-l-4",
                    isFullyCompleted
                      ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                      : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                  )}
                >
                  <Collapsible>
                    <CardContent className="p-3">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                        <Checkbox checked={isFullyCompleted} className="h-4 w-4" disabled />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{topic.title}</span>
                          {topic.isGlobal && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Global
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {completedResourcesCount}/{totalResourcesCount} kaynak
                        </Badge>
                        <ChevronRight className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 pl-6 space-y-1">
                        {topic.resources
                          .filter((r) => r.is_completed)
                          .map((resource) => (
                            <div key={resource.id} className="flex items-center gap-2 py-1">
                              <Checkbox checked className="h-3 w-3" disabled />
                              {getResourceIcon(resource.resource_type)}
                              <span
                                className="text-xs flex-1 cursor-pointer hover:text-primary"
                                onClick={() => window.open(resource.resource_url, "_blank", "noopener,noreferrer")}
                              >
                                {resource.title}
                              </span>
                            </div>
                          ))}
                      </CollapsibleContent>
                    </CardContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t pt-3">
        <div className="flex justify-between items-center">
          <h5 className="font-medium text-sm">Öğrenciye Özel Konular</h5>
          <Button variant="outline" size="sm" onClick={() => onAddTopic(studentId)}>
            <Plus className="h-3 w-3 mr-1" />
            Konu Ekle
          </Button>
        </div>

        {studentTopics.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Bu öğrenciye özel konu henüz eklenmemiş.</p>
        ) : (
          <div className="space-y-2">
            {studentTopics.map((topic) => (
              <Card key={topic.id} className="border">
                <Collapsible>
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger className="flex items-center gap-1" aria-label="Konu kaynaklarını genişlet">
                        <ChevronRight className="h-3 w-3" />
                      </CollapsibleTrigger>
                      <Checkbox checked={topic.is_completed} className="h-4 w-4" disabled />
                      <span className="text-sm flex-1">{topic.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {topic.resources.length} kaynak
                      </Badge>
                      <Button variant="ghost" size="sm" aria-label="Kaynak ekle" onClick={() => onAddResource(topic.id)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Konuyu düzenle" onClick={() => onEditTopic(topic)}>
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Konuyu sil"
                        onClick={() => onDeleteTopic(topic.id, studentId, studentUserId)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>

                    <CollapsibleContent className="mt-2 space-y-1">
                      {topic.resources.map((resource) => (
                        <div key={resource.id} className="flex items-center gap-2 pl-8">
                          <Checkbox checked={resource.is_completed} className="h-3 w-3" disabled />
                          {getResourceIcon(resource.resource_type)}
                          <span
                            className="text-xs flex-1 cursor-pointer hover:text-primary"
                            onClick={() => window.open(resource.resource_url, "_blank", "noopener,noreferrer")}
                          >
                            {resource.title}
                          </span>
                          <Button variant="ghost" size="sm" aria-label="Kaynağı düzenle" onClick={() => onEditResource(resource)}>
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Kaynağı sil"
                            onClick={() => onDeleteResource(resource.id, studentId, studentUserId)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
