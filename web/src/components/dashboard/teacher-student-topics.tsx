"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/panel-ui/card";
import { Button } from "@/components/panel-ui/button";
import { Checkbox } from "@/components/panel-ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/panel-ui/collapsible";
import { ChevronDown, ChevronRight, ExternalLink, Upload, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getResourceIcon } from "@/lib/admin/resource-icon";
import { useGroupTopics, type GroupTopic, type GroupResource } from "@/lib/lesson/use-group-topics";
import { toggleTopicCompletion as toggleTopicCompletionRpc } from "@/lib/lesson/service";
import { LessonTracker } from "./lesson-tracker";
import { UploadHomeworkDialog } from "./upload-homework-dialog";
import { HomeworkListDialog } from "./homework-list-dialog";

interface StudentRef {
  id: string;
  student_id: string;
  profiles: { full_name: string; email: string };
}

interface TeacherStudentTopicsProps {
  members: StudentRef[];
  groupName?: string;
  teacherId: string;
}

export function TeacherStudentTopics({ members, groupName, teacherId }: TeacherStudentTopicsProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [homeworkMemberIdx, setHomeworkMemberIdx] = useState(0);

  const primary = members[0];
  const isGroup = members.length > 1;
  const heading = groupName ?? primary.profiles.full_name;

  const { topics, loading, refetch: fetchTopics } = useGroupTopics(members.map((m) => m.student_id));

  useEffect(() => {
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.map((m) => m.student_id).join(",")]);

  function toggleTopic(topicId: string) {
    const next = new Set(expandedTopics);
    if (next.has(topicId)) next.delete(topicId);
    else next.add(topicId);
    setExpandedTopics(next);
  }

  async function upsertCompletion(studentId: string, resourceId: string, isCompleted: boolean) {
    const supabase = createClient();
    return supabase.from("student_resource_completion").upsert(
      {
        student_id: studentId,
        resource_id: resourceId,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,resource_id" },
    );
  }

  async function toggleResourceCompletion(resource: GroupResource, isCompleted: boolean, ownerStudentId: string, topicIsGlobal: boolean) {
    const nextState = !isCompleted;
    try {
      if (topicIsGlobal) {
        // Global resources are the same row for every one of this teacher's
        // students — cascade to every group member's own completion row.
        const results = await Promise.all(members.map((m) => upsertCompletion(m.student_id, resource.id, nextState)));
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      } else {
        const otherMemberId = members.find((m) => m.student_id !== ownerStudentId)?.student_id;
        const writes = [upsertCompletion(ownerStudentId, resource.id, nextState)];
        if (resource.siblingResourceId && otherMemberId) {
          writes.push(upsertCompletion(otherMemberId, resource.siblingResourceId, nextState));
        }
        const results = await Promise.all(writes);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }
      toast.success(`Kaynak ${nextState ? "tamamlandı" : "tamamlanmadı olarak işaretlendi"}`);
      fetchTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    }
  }

  async function toggleTopicCompletion(topic: GroupTopic, isCompleted: boolean) {
    const nextState = !isCompleted;
    try {
      if (topic.isGlobal) {
        // Independent per-resource upserts across every group member —
        // parallelized and checked (a silent partial failure would leave an
        // inconsistent completion state while the toast still said success).
        const results = await Promise.all(
          members.flatMap((m) => topic.resources.map((resource) => upsertCompletion(m.student_id, resource.id, nextState))),
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      } else {
        // The server-side RPC already cascades to a live-linked group
        // sibling in one transaction — no client-side fan-out needed here.
        const result = await toggleTopicCompletionRpc(topic.id, nextState);
        if (!result.success) throw new Error(result.error ?? "İşlem başarısız");
      }
      toast.success(`Konu ${nextState ? "tamamlandı" : "tamamlanmadı olarak işaretlendi"}`);
      fetchTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  function TopicCard({ topic }: { topic: GroupTopic }) {
    const isExpanded = expandedTopics.has(topic.id);
    return (
      <Card className="border-l-4 border-l-primary/30">
        <CardContent className="p-4">
          <Collapsible open={isExpanded} onOpenChange={() => toggleTopic(topic.id)}>
            <div className="flex items-start gap-3">
              <Checkbox checked={topic.is_completed} onCheckedChange={() => toggleTopicCompletion(topic, topic.is_completed)} className="mt-1 shrink-0" />
              <CollapsibleTrigger className="flex-1 text-left">
                <div className="flex items-start gap-2">
                  {isExpanded ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium">{topic.title}</h4>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{topic.resources.length}</span>
                    </div>
                    {topic.description && <p className={`text-sm text-muted-foreground mt-0.5 ${!isExpanded ? "line-clamp-2" : ""}`}>{topic.description}</p>}
                  </div>
                </div>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-4">
              <div className="pl-8 space-y-3">
                <h5 className="font-medium text-sm">Kaynaklar</h5>
                {topic.resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz kaynak yok.</p>
                ) : (
                  <div className="space-y-2">
                    {topic.resources.map((resource) => (
                      <div key={resource.id} className="flex items-center gap-3 p-2 bg-accent/30 rounded-md">
                        <Checkbox
                          checked={resource.is_completed ?? false}
                          onCheckedChange={() => toggleResourceCompletion(resource, resource.is_completed ?? false, topic.ownerStudentId, topic.isGlobal ?? false)}
                        />
                        {getResourceIcon(resource.resource_type)}
                        <div className="flex-1 cursor-pointer" onClick={() => window.open(resource.resource_url, "_blank", "noopener,noreferrer")}>
                          <p className="font-medium text-sm hover:text-primary transition-colors">{resource.title}</p>
                          {resource.description && <p className="text-xs text-muted-foreground">{resource.description}</p>}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => window.open(resource.resource_url, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <CardTitle>{heading} için konular</CardTitle>
              <CardDescription>
                {topics.filter((t) => t.is_completed).length} / {topics.length} konu tamamlandı
              </CardDescription>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3 w-full lg:w-auto">
              <Card className="w-full sm:w-auto sm:min-w-[200px]">
                <CardContent className="p-3 space-y-2">
                  {isGroup && (
                    <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container/60 p-1 font-mono text-[10px]">
                      {members.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setHomeworkMemberIdx(idx)}
                          className={`flex-1 rounded-full px-2 py-1 transition ${homeworkMemberIdx === idx ? "bg-secondary text-on-secondary" : "text-on-surface-variant"}`}
                        >
                          {m.profiles.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="flex flex-col items-center justify-center gap-1 h-16" onClick={() => setUploadDialogOpen(true)}>
                      <Upload className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Yükle</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex flex-col items-center justify-center gap-1 h-16" onClick={() => setListDialogOpen(true)}>
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Ödevler</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="w-full flex justify-center">
                <LessonTracker studentId={primary.student_id} studentName={heading} teacherId={teacherId} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {topics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Henüz konu yok.</p>
            </div>
          ) : (
            topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)
          )}
        </CardContent>
      </Card>

      <UploadHomeworkDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        studentId={members[homeworkMemberIdx]?.student_id ?? primary.student_id}
        teacherId={teacherId}
        uploadedByUserId={teacherId}
      />

      <HomeworkListDialog
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
        studentId={members[homeworkMemberIdx]?.student_id ?? primary.student_id}
        teacherId={teacherId}
        currentUserId={teacherId}
      />
    </div>
  );
}
