"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/panel-ui/alert-dialog";
import { Button } from "@/components/panel-ui/button";
import { Switch } from "@/components/panel-ui/switch";
import { Label } from "@/components/panel-ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/lesson/format";
import { completeTrialLesson, undoTrialLesson } from "@/lib/lesson/service";
import {
  getAllTimeSlots,
  getAllTimeSlotsActual,
  fetchActualLessonsForWeek,
  getWeekStartForOffset,
  clearWeekCache,
  prefetchWeek,
  type ActualLesson,
} from "@/lib/lesson/week-cache";
import { ScheduleGridCell } from "./schedule-grid-cell";

interface StudentLesson {
  id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  student_name: string;
  is_completed: boolean;
  note?: string | null;
}
interface TrialLesson {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  lesson_date: string;
}
interface WeeklyScheduleGridProps {
  teacherId: string;
}

const STUDENT_COLORS = [
  "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300",
  "bg-green-100 text-green-800 hover:bg-green-200 border-green-300",
  "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300",
  "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300",
  "bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-300",
  "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-300",
];

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function WeeklyScheduleGrid({ teacherId }: WeeklyScheduleGridProps) {
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentColors, setStudentColors] = useState<Record<string, string>>({});
  const [selectedTrialLesson, setSelectedTrialLesson] = useState<TrialLesson | null>(null);
  const [confirmAction, setConfirmAction] = useState<"complete" | "incomplete" | null>(null);
  const [processing, setProcessing] = useState(false);

  const [showTemplate, setShowTemplate] = useState(false);
  const [actualLessons, setActualLessons] = useState<ActualLesson[]>([]);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStartForOffset(weekOffset);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "dd.MM")} – ${format(weekEnd, "dd.MM.yyyy")}`;

  useEffect(() => {
    if (teacherId) fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  useEffect(() => {
    if (!showTemplate && teacherId) {
      fetchActualSchedule();
      prefetchWeek(teacherId, getWeekStartForOffset(weekOffset + 1));
      prefetchWeek(teacherId, getWeekStartForOffset(weekOffset - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTemplate, teacherId, weekOffset]);

  useEffect(() => {
    if (!teacherId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`schedule-grid-trial-lessons-${teacherId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trial_lessons", filter: `teacher_id=eq.${teacherId}` }, () => {
        clearWeekCache();
        fetchSchedule();
        if (!showTemplate) fetchActualSchedule();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, showTemplate]);

  async function fetchActualSchedule() {
    const data = await fetchActualLessonsForWeek(teacherId, weekStart);
    setActualLessons(data);
    setStudentColors((prev) => {
      const newStudents = [...new Set(data.map((l) => l.student_id))].filter((id) => !prev[id]);
      if (newStudents.length === 0) return prev;
      const colors: Record<string, string> = { ...prev };
      const existingCount = Object.keys(colors).length;
      newStudents.forEach((studentId, i) => {
        colors[studentId] = STUDENT_COLORS[(existingCount + i) % STUDENT_COLORS.length];
      });
      return colors;
    });
  }

  async function fetchSchedule() {
    setLoading(true);
    const supabase = createClient();
    try {
      // trial_lessons only filters by teacherId — independent of the
      // students/student_lessons chain below, so it doesn't need to wait
      // behind it.
      const [studentsRes, trialLessonsRes] = await Promise.all([
        supabase.from("students").select("student_id").eq("teacher_id", teacherId).eq("is_archived", false),
        supabase
          .from("trial_lessons")
          .select("id, day_of_week, start_time, end_time, is_completed, lesson_date")
          .eq("teacher_id", teacherId)
          .order("start_time", { ascending: true }),
      ]);
      if (studentsRes.error) throw studentsRes.error;
      if (trialLessonsRes.error) throw trialLessonsRes.error;
      setTrialLessons(trialLessonsRes.data ?? []);

      const activeStudentIds = (studentsRes.data ?? []).map((s) => s.student_id);

      const lessonsData =
        activeStudentIds.length > 0
          ? (
              await supabase
                .from("student_lessons")
                .select("id, student_id, day_of_week, start_time, end_time, is_completed, note")
                .eq("teacher_id", teacherId)
                .in("student_id", activeStudentIds)
                .order("start_time", { ascending: true })
                .throwOnError()
            ).data
          : [];

      const studentIds = Array.from(new Set((lessonsData ?? []).map((l) => l.student_id)));
      const profilesData = studentIds.length > 0 ? (await supabase.from("profiles").select("user_id, full_name").in("user_id", studentIds).throwOnError()).data : [];

      const studentNameMap: Record<string, string> = {};
      (profilesData ?? []).forEach((p) => {
        studentNameMap[p.user_id] = p.full_name;
      });

      const formattedLessons: StudentLesson[] = (lessonsData ?? []).map((l) => ({
        id: l.id,
        student_id: l.student_id,
        day_of_week: l.day_of_week,
        start_time: l.start_time,
        end_time: l.end_time,
        student_name: studentNameMap[l.student_id] ?? "Bilinmeyen",
        is_completed: l.is_completed,
        note: l.note,
      }));
      setLessons(formattedLessons);

      const uniqueStudents = Array.from(new Set(formattedLessons.map((l) => l.student_id)));
      const colors: Record<string, string> = {};
      uniqueStudents.forEach((studentId, index) => {
        colors[studentId] = STUDENT_COLORS[index % STUDENT_COLORS.length];
      });
      setStudentColors(colors);
    } catch {
      toast.error("Ders programı yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  const computedTimeSlots = showTemplate ? getAllTimeSlots(lessons, []) : getAllTimeSlotsActual(actualLessons, trialLessons);
  const studentColorsMap = new Map(Object.entries(studentColors));

  function handleTrialLessonClick(lesson: TrialLesson) {
    setSelectedTrialLesson(lesson);
    setConfirmAction(lesson.is_completed ? "incomplete" : "complete");
  }

  async function handleMarkComplete() {
    if (!selectedTrialLesson || processing) return;
    setProcessing(true);
    try {
      const result = await completeTrialLesson(selectedTrialLesson.id);
      if (!result.success) throw new Error(result.error ?? "İşlem başarısız");
      toast.success("Deneme dersi işlendi olarak işaretlendi");
      clearWeekCache();
      await fetchSchedule();
      if (!showTemplate) await fetchActualSchedule();
    } catch {
      toast.error("İşlem başarısız oldu");
    } finally {
      setSelectedTrialLesson(null);
      setConfirmAction(null);
      setProcessing(false);
    }
  }

  async function handleMarkIncomplete() {
    if (!selectedTrialLesson || processing) return;
    setProcessing(true);
    try {
      const result = await undoTrialLesson(selectedTrialLesson.id);
      if (!result.success) throw new Error(result.error ?? "İşlem başarısız");
      toast.success("Deneme dersi işlenmedi olarak işaretlendi");
      clearWeekCache();
      await fetchSchedule();
      if (!showTemplate) await fetchActualSchedule();
    } catch {
      toast.error("İşlem başarısız oldu");
    } finally {
      setSelectedTrialLesson(null);
      setConfirmAction(null);
      setProcessing(false);
    }
  }

  const timeSlots = computedTimeSlots;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`schedule-mode-${teacherId}`} className="text-xs text-muted-foreground">
            Güncel
          </Label>
          <Switch id={`schedule-mode-${teacherId}`} checked={showTemplate} onCheckedChange={setShowTemplate} />
          <Label htmlFor={`schedule-mode-${teacherId}`} className="text-xs text-muted-foreground">
            Kalıcı
          </Label>
        </div>
      </div>
      {!showTemplate && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setWeekOffset(0)}>
              Bu Hafta
            </Button>
          )}
          <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-center">{weekLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : lessons.length === 0 && actualLessons.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Henüz planlanmış ders yok</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="border bg-primary/10 p-2 text-sm font-semibold w-24">Saat</th>
                {DAYS.map((day) => (
                  <th key={day} className="border bg-primary/10 p-2 text-sm font-semibold">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot) => (
                <tr key={timeSlot}>
                  <td className="border bg-muted/50 p-2 text-center text-sm font-mono">{formatTime(timeSlot)}</td>
                  {DAYS.map((_, dayIndex) => (
                    <ScheduleGridCell
                      key={dayIndex}
                      showTemplate={showTemplate}
                      dayIndex={dayIndex}
                      timeSlot={timeSlot}
                      lessons={lessons}
                      actualLessons={actualLessons}
                      trialLessons={trialLessons}
                      weekStart={weekStart}
                      studentColors={studentColorsMap}
                      // Not yet wired to anything — clicking a real (non-ghost)
                      // lesson in "Güncel" mode currently does nothing. Flagged
                      // to Fatih rather than guessing at intended behavior.
                      onActualLessonClick={() => {}}
                      onTrialLessonClick={handleTrialLessonClick}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={confirmAction === "complete"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deneme Dersini İşle</AlertDialogTitle>
            <AlertDialogDescription>Bu deneme dersini işlendi olarak işaretlemek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkComplete}>İşlendi Olarak İşaretle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "incomplete"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İşlediyi Geri Al</AlertDialogTitle>
            <AlertDialogDescription>Bu deneme dersinin işlendiğini geri almak istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkIncomplete}>İşlendiyi Geri Al</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
