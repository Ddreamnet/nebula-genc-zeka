"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, BookOpen, CheckCircle, Clock, ExternalLink, ChevronDown, ChevronRight, Upload, ClipboardList, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/panel-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/panel-ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/panel-ui/collapsible";
import { Logo } from "@/components/site/logo";
import { WelcomeBanner } from "./welcome-banner";
import { getResourceIcon } from "@/lib/admin/resource-icon";
import { useStudentTopics } from "@/lib/lesson/use-student-topics";
import { HomeworkNotificationBell } from "./homework-notification-bell";
import { ContactDialog } from "./contact-dialog";
import { StudentLessonTracker } from "./student-lesson-tracker";
import { UploadHomeworkDialog } from "./upload-homework-dialog";
import { HomeworkListDialog } from "./homework-list-dialog";
import type { Topic } from "@/lib/admin/types";

export function StudentDashboard({ userId }: { userId: string }) {
  const { profile, signOut } = useAuth();
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const { allTopics: topics, loading, refetch: refetchTopics } = useStudentTopics(userId);

  useEffect(() => {
    refetchTopics();

    const supabase = createClient();
    supabase
      .from("students")
      .select("teacher_id, created_at")
      .eq("student_id", userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTeacherId(data.teacher_id);
        // Weeks since the student's `students` row was created — a fixed
        // anchor untouched by "Tüm Dersleri Sıfırla" (rpc_reset_package only
        // touches student_lesson_tracking/lesson_instances), so this keeps
        // counting up across package resets instead of jumping back with
        // the new cycle.
        setWeekNumber(Math.floor((Date.now() - new Date(data.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function toggleTopic(topicId: string) {
    const next = new Set(expandedTopics);
    if (next.has(topicId)) next.delete(topicId);
    else next.add(topicId);
    setExpandedTopics(next);
  }

  function getVisibleResources(topic: Topic) {
    if (topic.is_completed) return topic.resources;
    return topic.resources.filter((r) => r.is_completed);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  const completedTopics = topics.filter((t) => t.is_completed);
  const pendingTopics = topics.filter((t) => !t.is_completed && t.resources.some((r) => r.is_completed));
  const allActiveTopics = [...completedTopics, ...pendingTopics].sort((a, b) => a.order_index - b.order_index);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 pl-4 pr-2 sm:grid sm:h-20 sm:grid-cols-[1fr_auto_1fr] sm:pr-4">
          <Logo light disableLink large />
          <WelcomeBanner name={profile?.full_name ?? ""} variant="header" />
          <div className="flex items-center justify-end gap-2">
            <HomeworkNotificationBell userId={userId} isStudent onNotificationClick={() => setListDialogOpen(true)} />
            <Link href="/playground" className="pn-btn pn-btn--sm pn-btn--orange">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Playground</span>
            </Link>
            <ContactDialog />
            <button type="button" className="pn-btn pn-btn--sm pn-btn--red" disabled={signingOut} onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{signingOut ? "Çıkış..." : "Çıkış"}</span>
            </button>
          </div>
        </div>
      </header>

      <WelcomeBanner name={profile?.full_name ?? ""} variant="banner" />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Programdaki</p>
              <p className="text-3xl font-bold text-secondary">{weekNumber ?? "—"}. haftan</p>
            </CardContent>
          </Card>

          <StudentLessonTracker studentId={userId} />

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="flex h-full items-center justify-center p-4">
              <div className="grid w-full grid-cols-2 gap-3">
                <Button variant="outline" className="h-full flex flex-col items-center justify-center gap-2 min-h-[80px]" onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Yükle</span>
                </Button>
                <Button variant="outline" className="h-full flex flex-col items-center justify-center gap-2 min-h-[80px]" onClick={() => setListDialogOpen(true)}>
                  <ClipboardList className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Ödevler</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {allActiveTopics.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Öğrendiklerimiz
                </CardTitle>
                <CardDescription>Öğrenme materyallerin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {allActiveTopics.map((topic) => {
                  const visibleResources = getVisibleResources(topic);
                  const isExpanded = expandedTopics.has(topic.id);

                  return (
                    <Card key={topic.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-start gap-2 w-full text-left" onClick={() => toggleTopic(topic.id)}>
                            {isExpanded ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium">{topic.title}</h4>
                                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{visibleResources.length}</span>
                              </div>
                              {topic.description && <p className={`text-sm text-muted-foreground mt-0.5 ${!isExpanded ? "line-clamp-2" : ""}`}>{topic.description}</p>}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="mt-4">
                            <div className="pl-6 space-y-2">
                              <h5 className="font-medium text-sm">Kaynaklar</h5>
                              {visibleResources.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Bu konu için henüz gösterilecek kaynak bulunmuyor.</p>
                              ) : (
                                <div className="space-y-2">
                                  {visibleResources.map((resource) => (
                                    <div key={resource.id} className="flex items-center gap-3 p-2 bg-accent/30 rounded-md">
                                      {resource.is_completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                                      {getResourceIcon(resource.resource_type)}
                                      <div className="flex-1">
                                        <button className="font-medium text-sm text-left hover:underline cursor-pointer" onClick={() => window.open(resource.resource_url, "_blank")}>
                                          {resource.title}
                                        </button>
                                        {resource.description && <p className="text-xs text-muted-foreground">{resource.description}</p>}
                                      </div>
                                      <Button size="sm" variant="ghost" onClick={() => window.open(resource.resource_url, "_blank")}>
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
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Henüz Öğrenme Aktivitesi Yok</h3>
                <p className="text-muted-foreground">Öğretmeniniz size keşfetmeniz için konular ve kaynaklar atayacak.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <UploadHomeworkDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} studentId={userId} teacherId={teacherId} uploadedByUserId={userId} />

        <HomeworkListDialog open={listDialogOpen} onOpenChange={setListDialogOpen} studentId={userId} teacherId={teacherId} currentUserId={userId} />
      </div>
    </div>
  );
}
