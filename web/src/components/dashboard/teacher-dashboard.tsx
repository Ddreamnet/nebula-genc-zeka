"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, BookOpen, Wallet, Calendar, FileUser, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/panel-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/panel-ui/card";
import { Logo } from "@/components/site/logo";
import { WelcomeBanner } from "./welcome-banner";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { HomeworkNotificationBell } from "./homework-notification-bell";
import { GlobalTopicsManager } from "./global-topics-manager";
import { WeeklyScheduleDialog } from "./weekly-schedule-dialog";
import { TeacherBalanceDialog } from "./teacher-balance-dialog";
import { StudentAboutDialog } from "./student-about-dialog";
import { HomeworkListDialog } from "./homework-list-dialog";
import { TeacherStudentTopics } from "./teacher-student-topics";
import type { Student, StudentLessonBase } from "@/lib/admin/types";

interface Row {
  key: string;
  groupId: string | null;
  groupName: string | null;
  members: Student[];
}

function getLessonStatus(dayOfWeek: number, startTime: string): "past" | "upcoming" | "not-this-week" {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const mondayBasedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;
  const mondayBasedLessonDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - mondayBasedCurrentDay);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const lessonDate = new Date(startOfWeek);
  lessonDate.setDate(startOfWeek.getDate() + mondayBasedLessonDay);
  if (lessonDate < startOfWeek || lessonDate > endOfWeek) return "not-this-week";

  const [hours, minutes] = startTime.split(":").map(Number);
  const lessonTime = hours * 60 + minutes;

  if (mondayBasedLessonDay < mondayBasedCurrentDay || (mondayBasedLessonDay === mondayBasedCurrentDay && lessonTime < currentTime)) return "past";
  return "upcoming";
}

function getNextLessonTime(lessons: StudentLessonBase[]): number {
  if (lessons.length === 0) return Number.MAX_SAFE_INTEGER;
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  let earliest = Number.MAX_SAFE_INTEGER;
  for (const lesson of lessons) {
    const [hours, minutes] = lesson.startTime.split(":").map(Number);
    const lessonTime = hours * 60 + minutes;
    let daysUntil = (lesson.dayOfWeek - currentDay + 7) % 7;
    if (daysUntil === 0 && lessonTime < currentTime) daysUntil = 7;
    const timeUntil = daysUntil * 24 * 60 + lessonTime;
    if (timeUntil < earliest) earliest = timeUntil;
  }
  return earliest;
}

export function TeacherDashboard({ userId }: { userId: string }) {
  const { profile, signOut } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [groupNameById, setGroupNameById] = useState<Map<string, string>>(new Map());
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showGlobalTopics, setShowGlobalTopics] = useState(false);
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showStudentAbout, setShowStudentAbout] = useState(false);
  const [showHomeworkForStudent, setShowHomeworkForStudent] = useState<Student | null>(null);
  const [studentAboutData, setStudentAboutData] = useState<{ studentId: string; studentName: string; aboutText: string | null } | null>(null);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchStudents() {
    const supabase = createClient();
    try {
      const [studentsRes, lessonsRes, groupsRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, student_id, is_archived, about_text, group_id, profiles!students_student_id_fkey(full_name, email)")
          .eq("teacher_id", userId)
          .eq("is_archived", false),
        supabase.from("student_lessons").select("*").eq("teacher_id", userId),
        supabase.from("groups").select("id, name").eq("teacher_id", userId),
      ]);
      const { data: studentsData, error: studentsError } = studentsRes;
      if (studentsError) throw studentsError;
      const { data: lessonsData, error: lessonsError } = lessonsRes;
      if (lessonsError) throw lessonsError;
      const { data: groupsData, error: groupsError } = groupsRes;
      if (groupsError) throw groupsError;

      const withLessons: Student[] = (studentsData ?? []).map((student) => ({
        ...student,
        about_text: student.about_text ?? null,
        group_id: student.group_id ?? null,
        lessons: (lessonsData ?? [])
          .filter((l) => l.student_id === student.student_id)
          .map((l) => ({ id: l.id, dayOfWeek: l.day_of_week, startTime: l.start_time, endTime: l.end_time })),
      }));

      withLessons.sort((a, b) => getNextLessonTime(a.lessons) - getNextLessonTime(b.lessons));
      setStudents(withLessons);
      setGroupNameById(new Map((groupsData ?? []).map((g) => [g.id, g.name])));
    } catch {
      toast.error("Öğrenciler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  const rows: Row[] = (() => {
    const byGroup = new Map<string, Student[]>();
    const soloRows: Row[] = [];
    for (const s of students) {
      if (s.group_id) {
        const list = byGroup.get(s.group_id) ?? [];
        list.push(s);
        byGroup.set(s.group_id, list);
      } else {
        soloRows.push({ key: s.id, groupId: null, groupName: null, members: [s] });
      }
    }
    const groupRows: Row[] = [...byGroup.entries()].map(([groupId, members]) => ({
      key: groupId,
      groupId,
      groupName: groupNameById.get(groupId) ?? "Grup",
      members,
    }));
    return [...soloRows, ...groupRows].sort(
      (a, b) => getNextLessonTime(a.members.flatMap((m) => m.lessons)) - getNextLessonTime(b.members.flatMap((m) => m.lessons)),
    );
  })();

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
          <WelcomeBanner name={profile?.full_name ?? ""} variant="header" />
          <div className="flex items-center justify-end gap-2">
            <HomeworkNotificationBell
              userId={userId}
              onNotificationClick={(studentId) => {
                const student = students.find((s) => s.student_id === studentId);
                if (student) setShowHomeworkForStudent(student);
              }}
            />
            <button type="button" className="pn-btn pn-btn--sm pn-btn--green" onClick={() => setShowGlobalTopics(true)}>
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Konular</span>
            </button>
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

      <WelcomeBanner name={profile?.full_name ?? ""} variant="banner" />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 pt-4 pb-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Öğrencilerim</CardTitle>
                <CardDescription>{students.length} öğrenci kayıtlı</CardDescription>
              </div>
              <div className="flex flex-row sm:flex-col items-end gap-1.5 sm:gap-2">
                <Button onClick={() => setShowBalance(true)} variant="outline" size="sm" className="text-xs px-2">
                  <Wallet className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Bakiye</span>
                </Button>
                <Button onClick={() => setShowWeeklySchedule(true)} variant="outline" size="sm" className="text-xs px-2">
                  <Calendar className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Derslerim</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz öğrenci yok.</p>
            ) : (
              rows.map((row) => {
                const displayLessons = row.members[0]?.lessons ?? [];
                return (
                  <Card
                    key={row.key}
                    className={`cursor-pointer transition-colors hover:bg-accent ${selectedRow?.key === row.key ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedRow(row)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{row.groupName ?? row.members[0].profiles.full_name}</h4>
                            <div className="flex items-center gap-0.5">
                              {row.members.map((member) => (
                                <Button
                                  key={member.id}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  aria-label={`${member.profiles.full_name} hakkında`}
                                  title={row.groupName ? member.profiles.full_name : undefined}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStudentAboutData({ studentId: member.student_id, studentName: member.profiles.full_name, aboutText: member.about_text });
                                    setShowStudentAbout(true);
                                  }}
                                >
                                  <FileUser className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {row.groupName ? row.members.map((m) => m.profiles.full_name).join(" & ") : row.members[0].profiles.email}
                          </p>
                          {displayLessons.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {displayLessons.map((lesson, index) => {
                                const status = getLessonStatus(lesson.dayOfWeek, lesson.startTime);
                                return (
                                  <div key={index} className="flex items-center gap-1 text-xs">
                                    <span
                                      className={
                                        status === "past"
                                          ? "text-[10px] text-red-600 line-through"
                                          : status === "upcoming"
                                            ? "text-sm text-green-600 font-medium"
                                            : "text-xs text-muted-foreground"
                                      }
                                    >
                                      {getDayName(lesson.dayOfWeek)} {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>

        <div>
          {selectedRow ? (
            <TeacherStudentTopics members={selectedRow.members} groupName={selectedRow.groupName ?? undefined} teacherId={userId} />
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Bir Öğrenci Seç</h3>
                <p className="text-muted-foreground">Konuları görüntülemek ve yönetmek için listeden bir öğrenci seçin</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <GlobalTopicsManager open={showGlobalTopics} onOpenChange={setShowGlobalTopics} isAdmin={false} />
      <WeeklyScheduleDialog open={showWeeklySchedule} onOpenChange={setShowWeeklySchedule} teacherId={userId} />
      <TeacherBalanceDialog open={showBalance} onOpenChange={setShowBalance} teacherId={userId} />

      {studentAboutData && (
        <StudentAboutDialog
          key={studentAboutData.studentId}
          open={showStudentAbout}
          onOpenChange={setShowStudentAbout}
          studentId={studentAboutData.studentId}
          studentName={studentAboutData.studentName}
          aboutText={studentAboutData.aboutText}
          isReadOnly={false}
          onSaved={async () => {
            await fetchStudents();
            setStudentAboutData(null);
          }}
        />
      )}

      {showHomeworkForStudent && (
        <HomeworkListDialog
          open={!!showHomeworkForStudent}
          onOpenChange={(open) => !open && setShowHomeworkForStudent(null)}
          studentId={showHomeworkForStudent.student_id}
          teacherId={userId}
          currentUserId={userId}
        />
      )}
    </div>
  );
}
