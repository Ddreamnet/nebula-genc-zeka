"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BookOpen, Calendar, Gem, Hammer, Newspaper, Plus, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { adminRestoreStudent } from "@/lib/lesson/service";
import { fetchGlobalTopics } from "@/lib/lesson/global-topics-cache";
import { PanelShell, type PanelNavItem } from "@/components/panel-shell/panel-shell";
import { SideDrawer } from "@/components/panel-shell/side-drawer";
import { longDateLabel } from "@/lib/lesson/next-lesson";
import { TeacherRail } from "./admin/teacher-rail";
import { StudentList } from "./admin/student-list";
import { CreateTeacherDialog } from "./admin/create-teacher-dialog";
import { CreateStudentDialog } from "./admin/create-student-dialog";
import { EditStudentDialog } from "./admin/edit-student-dialog";
import { EditTeacherDialog } from "./admin/edit-teacher-dialog";
import { ManageGroupsDialog } from "./admin/manage-groups-dialog";
import { BalanceManager } from "./admin/balance-manager";
import { PlaygroundTreasuryButton } from "./admin/playground-treasury";
import { WeeklyScheduleGrid } from "./weekly-schedule-grid";
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
  // Üç panel de aynı yuvayı paylaşır; ikisi aynı anda açılamaz çünkü
  // `drawer` tek bir değerdir. Eskiden bunlar sekmeydi ve sekme şeridi ana
  // kolonun üstünde kalıcı bir satır harcıyordu.
  const [drawer, setDrawer] = useState<"schedule" | "balance" | null>(null);
  const [showTreasury, setShowTreasury] = useState(false);

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
        supabase.from("topics").select("id, title, description, is_completed, completed_at, order_index, group_link_id, resources (id, title, description, resource_type, resource_url, order_index, group_link_id)").eq("student_id", studentUserId).order("order_index"),
        fetchGlobalTopics(),
        supabase.from("student_resource_completion").select("resource_id, is_completed").eq("student_id", studentUserId),
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
          .select("id, student_id, teacher_id, day_of_week, start_time, end_time, note, meeting_url")
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
              meetingUrl: l.meeting_url,
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

  const nav: PanelNavItem[] = [
    { key: "teachers", label: "Öğretmenler", icon: Users, tone: "blue", active: drawer === null, onClick: () => setDrawer(null) },
    {
      key: "schedule",
      label: "Haftalık program",
      icon: Calendar,
      tone: "mint",
      active: drawer === "schedule",
      onClick: () => setDrawer(drawer === "schedule" ? null : "schedule"),
    },
    {
      key: "balance",
      label: "Bakiye",
      icon: Wallet,
      tone: "peach",
      active: drawer === "balance",
      onClick: () => setDrawer(drawer === "balance" ? null : "balance"),
    },
    { key: "playground", label: "Üretim Atölyesi", icon: Hammer, tone: "violet", href: "/playground" },
    { key: "topics", label: "Konu kütüphanesi", icon: BookOpen, tone: "blue", onClick: () => setShowGlobalTopics(true) },
    { key: "treasury", label: "Atölye kasası", icon: Gem, tone: "mint", onClick: () => setShowTreasury(true) },
    { key: "blog", label: "Blog yönetimi", icon: Newspaper, tone: "pink", onClick: () => setShowBlogManager(true) },
  ];

  return (
    <PanelShell
      greeting="Yönetim paneli"
      subline={longDateLabel(new Date())}
      nav={nav}
      initials="AD"
      onSignOut={handleSignOut}
      signingOut={signingOut}
      chip={
        <span className="pn-bar-btn pn-bar-btn--num" title="Aktif öğretmen sayısı">
          {teachers.length}
          <span className="text-[10px] font-normal tracking-wide text-[color:var(--pn-on-navy-dim)]">ÖĞRETMEN</span>
        </span>
      }
      bell={<NotificationBell variant="bar" />}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-3 md:grid-cols-[210px_1fr] lg:items-stretch lg:gap-4">
        <TeacherRail
          teachers={teachers}
          selectedId={selectedTeacherId}
          onSelect={(teacher) => {
            setSelectedTeacherId(teacher.user_id);
            setDrawer(null);
          }}
          onCreate={() => setShowCreateTeacher(true)}
          onEdit={setEditingTeacher}
        />

        <div className="flex min-h-0 min-w-0 items-stretch gap-3">
          {drawer !== "schedule" &&
            (selectedTeacher ? (
              <section className="pn-card min-h-0 flex-1" aria-label={`${selectedTeacher.full_name} öğrencileri`}>
                <div className="pn-band pn-band--blue">
                  <div className="flex min-w-0 flex-col">
                    <h2 className="pn-card-title truncate">{selectedTeacher.full_name}</h2>
                    <p className="pn-card-sub truncate">
                      {selectedTeacher.students.filter((s) => !s.is_archived).length} aktif öğrenci
                    </p>
                  </div>
                  <span className="flex-1" />
                  <button type="button" className="pn-btn pn-btn--sm pn-btn--paper" onClick={() => setShowManageGroups(true)}>
                    <Users className="size-4" strokeWidth={1.9} aria-hidden />
                    Gruplar
                  </button>
                  <button type="button" className="pn-btn pn-btn--sm pn-btn--blue" onClick={() => setShowCreateStudent(true)}>
                    <Plus className="size-4" strokeWidth={2} aria-hidden />
                    Öğrenci
                  </button>
                </div>

                <div className="pn-scroll min-h-0 flex-1 p-2.5">
                  <StudentList
                    students={selectedTeacher.students}
                    groups={selectedTeacher.groups ?? []}
                    onRestoreStudent={handleRestoreStudent}
                    onEditStudent={setEditingStudent}
                    onOpenStudentAbout={(student) => {
                      setStudentAboutData({
                        studentId: student.student_id,
                        studentName: student.profiles.full_name,
                        aboutText: student.about_text,
                      });
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
                </div>
              </section>
            ) : (
              // Boş bir yuva, başarısız bir kart değil — kesikli çerçeve
              // "seçim bekliyor" der.
              <div className="flex min-h-[112px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[16px] border-[1.5px] border-dashed border-[color:rgba(74,47,184,.32)] px-6 py-5 text-center lg:min-h-[220px]">
                <p className="font-display text-[15px] font-semibold text-[color:var(--pn-violet-ink)]">Bir öğretmen seç</p>
                <p className="max-w-[240px] text-[12px] text-on-surface-variant">Öğrencileri ve konuları burada görünür.</p>
              </div>
            ))}

          {selectedTeacher && drawer === "balance" && (
            <SideDrawer open wide onClose={() => setDrawer(null)} tone="peach" title="Bakiye" subtitle={selectedTeacher.full_name}>
              <div className="min-w-0 overflow-x-auto">
                <BalanceManager teacherId={selectedTeacher.user_id} />
              </div>
            </SideDrawer>
          )}

          {selectedTeacher && drawer === "schedule" && (
            <SideDrawer
              open
              wide
              onClose={() => setDrawer(null)}
              tone="mint"
              title="Haftalık program"
              subtitle={selectedTeacher.full_name}
            >
              <div className="min-w-0 overflow-x-auto">
                <WeeklyScheduleGrid teacherId={selectedTeacher.user_id} />
              </div>
            </SideDrawer>
          )}

          {!selectedTeacher && drawer !== null && (
            <div className="flex flex-1 items-center justify-center rounded-[16px] border-[1.5px] border-dashed border-[color:rgba(74,47,184,.32)] px-6 text-center text-[12px] text-on-surface-variant">
              Önce bir öğretmen seç.
            </div>
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

      <PlaygroundTreasuryButton open={showTreasury} onOpenChange={setShowTreasury} />
    </PanelShell>
  );
}
