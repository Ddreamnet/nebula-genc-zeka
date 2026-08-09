"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BookOpen, LogOut, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { adminRestoreStudent } from "@/lib/lesson/service";
import { fetchGlobalTopics } from "@/lib/lesson/global-topics-cache";
import { Button } from "@/components/panel-ui/button";
import { Logo } from "@/components/site/logo";
import { WelcomeBanner } from "./welcome-banner";
import { TeacherList } from "./admin/teacher-list";
import { StudentList } from "./admin/student-list";
import { CreateTeacherDialog } from "./admin/create-teacher-dialog";
import { CreateStudentDialog } from "./admin/create-student-dialog";
import { EditStudentDialog } from "./admin/edit-student-dialog";
import { EditTeacherDialog } from "./admin/edit-teacher-dialog";
import { ManageGroupsDialog } from "./admin/manage-groups-dialog";
import { BalanceManager } from "./admin/balance-manager";
import { PlaygroundTreasury } from "./admin/playground-treasury";
import { WeeklyScheduleGrid } from "./weekly-schedule-grid";
import { Card, CardContent } from "@/components/panel-ui/card";
import { AddTopicDialog } from "./admin/add-topic-dialog";
import { AddResourceDialog } from "./admin/add-resource-dialog";
import { EditTopicDialog } from "./admin/edit-topic-dialog";
import { EditResourceDialog } from "./admin/edit-resource-dialog";
import { useTopicsCrud } from "./admin/use-topics-crud";
import { GlobalTopicsManager } from "./global-topics-manager";
// TipTap (8 packages) only ships to the browser once an admin actually opens
// "Blog Yönetimi" instead of bloating every admin's initial dashboard bundle.
const BlogManager = dynamic(() => import("./admin/blog-manager").then((mod) => mod.BlogManager));
import { NotificationBell } from "./admin/notification-bell";
import { StudentAboutDialog } from "./student-about-dialog";
import { cn } from "@/lib/cn";
import type { Teacher, Student, Topic, Resource } from "@/lib/admin/types";

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [activeTab, setActiveTab] = useState<"students" | "schedule" | "balance">("students");

  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [studentTopicsMap, setStudentTopicsMap] = useState<Map<string, Topic[]>>(new Map());
  const [studentCompletedTopics, setStudentCompletedTopics] = useState<Map<string, Topic[]>>(new Map());
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showEditTopic, setShowEditTopic] = useState(false);
  const [showEditResource, setShowEditResource] = useState(false);
  const [selectedStudentForTopic, setSelectedStudentForTopic] = useState<string | null>(null);
  const [selectedTopicForResource, setSelectedTopicForResource] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showBlogManager, setShowBlogManager] = useState(false);
  const [showGlobalTopics, setShowGlobalTopics] = useState(false);
  const [showStudentAbout, setShowStudentAbout] = useState(false);
  const [studentAboutData, setStudentAboutData] = useState<{ studentId: string; studentName: string; aboutText: string | null } | null>(null);

  const selectedTeacher = teachers.find((t) => t.user_id === selectedTeacherId) ?? null;

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchStudentTopics(studentUserId: string, studentId: string) {
    const supabase = createClient();
    try {
      const [studentTopicsRes, globalTopics, completionRes] = await Promise.all([
        supabase.from("topics").select("*, resources (*)").eq("student_id", studentUserId).order("order_index"),
        fetchGlobalTopics(),
        supabase.from("student_resource_completion").select("*").eq("student_id", studentUserId),
      ]);
      if (studentTopicsRes.error) throw studentTopicsRes.error;
      if (completionRes.error) throw completionRes.error;

      const completionMap = new Map<string, { resource_id: string; is_completed: boolean }>();
      for (const c of completionRes.data ?? []) completionMap.set(c.resource_id, c);

      const processedStudentTopics: Topic[] = (studentTopicsRes.data ?? []).map((topic) => ({
        ...topic,
        resources: (topic.resources ?? [])
          .map((r) => ({ ...r, is_completed: completionMap.get(r.id)?.is_completed ?? false }))
          .sort((a, b) => a.order_index - b.order_index),
        isGlobal: false,
      }));

      setStudentTopicsMap((prev) => new Map(prev).set(studentId, processedStudentTopics));

      const studentTopicTitles = new Set(processedStudentTopics.map((t) => t.title));
      const processedGlobalTopics: Topic[] = globalTopics
        .filter((topic) => !studentTopicTitles.has(topic.title))
        .map((topic) => {
          const globalResources: Resource[] = (topic.global_topic_resources ?? [])
            .map((res) => ({
              id: res.id,
              title: res.title,
              description: res.description,
              resource_type: res.resource_type,
              resource_url: res.resource_url,
              order_index: res.order_index,
              is_completed: completionMap.get(res.id)?.is_completed ?? false,
            }))
            .sort((a, b) => a.order_index - b.order_index);

          return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            is_completed: globalResources.length > 0 && globalResources.every((r) => r.is_completed),
            order_index: topic.order_index,
            resources: globalResources,
            isGlobal: true,
          };
        });

      const allTopics = [...processedStudentTopics, ...processedGlobalTopics].sort((a, b) => {
        if (a.isGlobal && !b.isGlobal) return 1;
        if (!a.isGlobal && b.isGlobal) return -1;
        return a.order_index - b.order_index;
      });

      setStudentCompletedTopics((prev) => new Map(prev).set(studentId, allTopics));
    } catch {
      toast.error("Konular yüklenemedi");
    }
  }

  const topicsCrud = useTopicsCrud({
    adminUserId: profile?.user_id,
    selectedTeacherStudents: selectedTeacher?.students,
    studentTopics: studentTopicsMap,
    fetchStudentTopics,
  });

  async function toggleStudent(studentId: string, student: Student) {
    const next = new Set(expandedStudents);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
      if (!studentTopicsMap.has(studentId)) {
        await fetchStudentTopics(student.student_id, studentId);
      }
    }
    setExpandedStudents(next);
  }

  async function fetchTeachers() {
    const supabase = createClient();
    try {
      const { data: teacherRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      if (rolesError) throw rolesError;

      const teacherIds = (teacherRoles ?? []).map((r) => r.user_id);
      if (teacherIds.length === 0) {
        setTeachers([]);
        return;
      }

      const [profilesRes, studentsRes, lessonsRes, groupsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", teacherIds).order("full_name"),
        supabase
          .from("students")
          .select("id, student_id, teacher_id, is_archived, about_text, group_id, profiles!students_student_id_fkey(full_name, email)")
          .in("teacher_id", teacherIds),
        supabase
          .from("student_lessons")
          .select("id, student_id, teacher_id, day_of_week, start_time, end_time, note")
          .in("teacher_id", teacherIds),
        supabase.from("groups").select("id, teacher_id, name").in("teacher_id", teacherIds),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (groupsRes.error) throw groupsRes.error;

      const studentsByTeacher = new Map<string, typeof studentsRes.data>();
      for (const s of studentsRes.data ?? []) {
        const list = studentsByTeacher.get(s.teacher_id) ?? [];
        list.push(s);
        studentsByTeacher.set(s.teacher_id, list);
      }

      const lessonsByStudent = new Map<string, typeof lessonsRes.data>();
      for (const l of lessonsRes.data ?? []) {
        const list = lessonsByStudent.get(l.student_id) ?? [];
        list.push(l);
        lessonsByStudent.set(l.student_id, list);
      }

      const groupsByTeacher = new Map<string, typeof groupsRes.data>();
      for (const g of groupsRes.data ?? []) {
        const list = groupsByTeacher.get(g.teacher_id) ?? [];
        list.push(g);
        groupsByTeacher.set(g.teacher_id, list);
      }

      const teachersWithStudents: Teacher[] = (profilesRes.data ?? []).map((teacher) => ({
        ...teacher,
        groups: groupsByTeacher.get(teacher.user_id) ?? [],
        students: (studentsByTeacher.get(teacher.user_id) ?? []).map((student) => ({
          id: student.id,
          student_id: student.student_id,
          is_archived: student.is_archived ?? false,
          about_text: student.about_text ?? null,
          group_id: student.group_id ?? null,
          profiles: student.profiles,
          lessons: (lessonsByStudent.get(student.student_id) ?? [])
            .filter((l) => l.teacher_id === teacher.user_id)
            .map((l) => ({
              id: l.id,
              dayOfWeek: l.day_of_week,
              startTime: l.start_time,
              endTime: l.end_time,
              note: l.note,
            })),
        })),
      }));

      setTeachers(teachersWithStudents);
    } catch {
      toast.error("Öğretmenler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreStudent(studentId: string) {
    const teacher = teachers.find((t) => t.students.some((s) => s.id === studentId));
    const student = teacher?.students.find((s) => s.id === studentId);
    if (!teacher || !student) return;

    setRestoringId(studentId);
    try {
      const result = await adminRestoreStudent(studentId, student.student_id, teacher.user_id);
      if (!result.success) throw new Error(result.error ?? "Geri alma başarısız");
      toast.success(
        `Öğrenci geri alındı${result.instances_created ? ` (${result.instances_created} ders planlandı)` : ""}`,
      );
      // Restoring only ever flips this one student's is_archived flag — the
      // template `lessons` this list renders don't change, so a full
      // fetchTeachers() (all teachers × all students × all lessons) would be
      // pure waste. Update the one record we already know changed instead.
      setTeachers((prev) =>
        prev.map((t) =>
          t.user_id !== teacher.user_id
            ? t
            : { ...t, students: t.students.map((s) => (s.id === studentId ? { ...s, is_archived: false } : s)) },
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Geri alma başarısız");
    } finally {
      setRestoringId(null);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

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
          <WelcomeBanner name="Admin" variant="header" />
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="pn-btn pn-btn--sm pn-btn--green" onClick={() => setShowGlobalTopics(true)}>
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Konular</span>
            </button>
            <button type="button" className="pn-btn pn-btn--sm pn-btn--green" onClick={() => setShowBlogManager(true)}>
              Blog
            </button>
            <NotificationBell />
            <Link href="/playground" className="pn-btn pn-btn--sm pn-btn--orange">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Playground</span>
            </Link>
            <button type="button" className="pn-btn pn-btn--sm pn-btn--red" disabled={signingOut} onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{signingOut ? "Çıkış..." : "Çıkış"}</span>
            </button>
          </div>
        </div>
      </header>

      <WelcomeBanner name="Admin" variant="banner" />

      <div className="px-4 pt-4">
        <PlaygroundTreasury />
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 pt-4 pb-6 lg:grid-cols-[320px_1fr]">
        <TeacherList
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          onSelectTeacher={(t) => {
            setSelectedTeacherId(t.user_id);
            setActiveTab("students");
          }}
          onCreateTeacher={() => setShowCreateTeacher(true)}
          onEditTeacher={setEditingTeacher}
        />

        <div>
          {selectedTeacher ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container/60 p-1 font-mono text-xs">
                  <button
                    onClick={() => setActiveTab("students")}
                    className={cn(
                      "rounded-full px-3 py-1.5 transition",
                      activeTab === "students" ? "bg-secondary text-on-secondary" : "text-on-surface-variant",
                    )}
                  >
                    Öğrenciler
                  </button>
                  <button
                    onClick={() => setActiveTab("schedule")}
                    className={cn(
                      "rounded-full px-3 py-1.5 transition",
                      activeTab === "schedule" ? "bg-secondary text-on-secondary" : "text-on-surface-variant",
                    )}
                  >
                    Ders Programı
                  </button>
                  <button
                    onClick={() => setActiveTab("balance")}
                    className={cn(
                      "rounded-full px-3 py-1.5 transition",
                      activeTab === "balance" ? "bg-secondary text-on-secondary" : "text-on-surface-variant",
                    )}
                  >
                    Bakiye
                  </button>
                </div>
                {activeTab === "students" && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowManageGroups(true)}>
                      <Users className="h-4 w-4" />
                      <span className="ml-1.5">Gruplar</span>
                    </Button>
                    <Button size="sm" onClick={() => setShowCreateStudent(true)}>
                      Öğrenci Oluştur
                    </Button>
                  </div>
                )}
              </div>
              {activeTab === "students" ? (
                <StudentList
                  students={selectedTeacher.students}
                  groups={selectedTeacher.groups ?? []}
                  onRestoreStudent={handleRestoreStudent}
                  onEditStudent={setEditingStudent}
                  onOpenStudentAbout={(student) => {
                    setStudentAboutData({ studentId: student.student_id, studentName: student.profiles.full_name, aboutText: student.about_text });
                    setShowStudentAbout(true);
                  }}
                  restoringId={restoringId}
                  expandedStudents={expandedStudents}
                  studentTopics={studentTopicsMap}
                  studentCompletedTopics={studentCompletedTopics}
                  onToggleStudent={toggleStudent}
                  onAddTopic={(studentId) => {
                    setSelectedStudentForTopic(studentId);
                    setShowAddTopic(true);
                  }}
                  onAddResource={(topicId) => {
                    setSelectedTopicForResource(topicId);
                    setShowAddResource(true);
                  }}
                  onEditTopic={(topic) => {
                    setEditingTopic(topic);
                    setShowEditTopic(true);
                  }}
                  onEditResource={(resource) => {
                    setEditingResource(resource);
                    setShowEditResource(true);
                  }}
                  onDeleteTopic={topicsCrud.handleDeleteTopic}
                  onDeleteResource={topicsCrud.handleDeleteResource}
                />
              ) : activeTab === "schedule" ? (
                <Card>
                  <CardContent className="pt-6">
                    <WeeklyScheduleGrid teacherId={selectedTeacher.user_id} />
                  </CardContent>
                </Card>
              ) : (
                <BalanceManager teacherId={selectedTeacher.user_id} />
              )}
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">Öğrencilerini görmek için bir öğretmen seç.</p>
          )}
        </div>
      </div>

      <CreateTeacherDialog open={showCreateTeacher} onOpenChange={setShowCreateTeacher} onSuccess={fetchTeachers} />
      {selectedTeacher && (
        <CreateStudentDialog
          open={showCreateStudent}
          onOpenChange={setShowCreateStudent}
          onStudentCreated={fetchTeachers}
          teacherId={selectedTeacher.user_id}
        />
      )}
      {editingStudent && (
        <EditStudentDialog
          open={!!editingStudent}
          onOpenChange={(open) => !open && setEditingStudent(null)}
          onStudentUpdated={fetchTeachers}
          studentId={editingStudent.id}
          currentName={editingStudent.profiles.full_name}
          currentLessons={editingStudent.lessons}
          asAdmin
        />
      )}
      {selectedTeacher && (
        <ManageGroupsDialog
          open={showManageGroups}
          onOpenChange={setShowManageGroups}
          teacherId={selectedTeacher.user_id}
          students={selectedTeacher.students}
          groups={selectedTeacher.groups ?? []}
          onUpdated={fetchTeachers}
        />
      )}
      {editingTeacher && (
        <EditTeacherDialog
          open={!!editingTeacher}
          onOpenChange={(open) => !open && setEditingTeacher(null)}
          onTeacherUpdated={fetchTeachers}
          teacherId={editingTeacher.user_id}
          currentName={editingTeacher.full_name}
        />
      )}

      <AddTopicDialog
        open={showAddTopic}
        onOpenChange={setShowAddTopic}
        onAddTopic={(title, description) => topicsCrud.handleAddTopic(title, description, selectedStudentForTopic)}
      />
      <AddResourceDialog
        open={showAddResource}
        onOpenChange={setShowAddResource}
        topicId={selectedTopicForResource}
        onAddResource={(title, description, type, url) =>
          topicsCrud.handleAddResource(title, description, type, url, selectedTopicForResource)
        }
      />
      <EditTopicDialog open={showEditTopic} onOpenChange={setShowEditTopic} onEditTopic={topicsCrud.handleEditTopic} topic={editingTopic} />
      <EditResourceDialog
        open={showEditResource}
        onOpenChange={setShowEditResource}
        onEditResource={topicsCrud.handleEditResource}
        resource={editingResource}
      />

      {showBlogManager && <BlogManager open={showBlogManager} onOpenChange={setShowBlogManager} />}

      <GlobalTopicsManager open={showGlobalTopics} onOpenChange={setShowGlobalTopics} isAdmin />

      {studentAboutData && (
        <StudentAboutDialog
          key={studentAboutData.studentId}
          open={showStudentAbout}
          onOpenChange={(open) => {
            setShowStudentAbout(open);
            if (!open) setStudentAboutData(null);
          }}
          studentId={studentAboutData.studentId}
          studentName={studentAboutData.studentName}
          aboutText={studentAboutData.aboutText}
          isReadOnly={false}
          onSaved={async () => {
            await fetchTeachers();
            setStudentAboutData(null);
          }}
        />
      )}
    </div>
  );
}
