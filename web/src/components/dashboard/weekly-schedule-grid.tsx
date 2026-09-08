"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmSheet } from "@/components/panel-ui/sheet";
import { Button } from "@/components/panel-ui/button";
import { Switch } from "@/components/panel-ui/switch";
import { Label } from "@/components/panel-ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { format, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/lesson/format";
import { completeTrialLesson, undoTrialLesson, completeLesson, undoCompleteLesson } from "@/lib/lesson/service";
import { useAsyncAction } from "@/lib/use-async-action";
import { translateLessonError } from "@/lib/lesson/errors";
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

/**
 * Six student chips, built from the "Kâğıt Uzay" accents rather than
 * Tailwind's stock blue-100/blue-800 family — those belong to no palette this
 * product owns, and they were the single biggest reason the weekly grid read
 * as a different application from the page around it.
 *
 * Each entry is a light paper fill, the navy-leaning ink that is legible on
 * it, and a border in the accent's own deep tone. Contrast on every pair is
 * above 7:1 against its fill.
 */
const STUDENT_COLORS = [
  "bg-[#c9d9ff] text-[#16215c] border-[#3d5fe0] hover:bg-[#b5cbff]",
  "bg-[#c4f0dc] text-[#05231a] border-[#17915b] hover:bg-[#aee7cd]",
  "bg-[#ffe0c2] text-[#5c2f00] border-[#d2701a] hover:bg-[#ffd3ab]",
  "bg-[#ffd4dd] text-[#5a1024] border-[#ce3b5f] hover:bg-[#ffc2cf]",
  "bg-[#e2d6f7] text-[#2a1a4d] border-[#8b6bff] hover:bg-[#d5c4f3]",
  "bg-[#fff2b8] text-[#4a3a00] border-[#c9a227] hover:bg-[#ffec9c]",
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
  // A real (non-trial) lesson awaiting confirmation. Clicking one used to do
  // nothing at all — onActualLessonClick was an empty arrow function.
  const [selectedLesson, setSelectedLesson] = useState<ActualLesson | null>(null);
  // Which single day the phone layout shows. Monday-indexed like DAYS; the
  // week starts on today so the first thing a teacher sees is today.
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  });

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
      // "*" rather than "UPDATE": a trial lesson being ADDED or REMOVED is
      // exactly as relevant to this grid as one being edited, and neither
      // used to refresh it.
      .on("postgres_changes", { event: "*", schema: "public", table: "trial_lessons", filter: `teacher_id=eq.${teacherId}` }, () => {
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

      // Merge, never replace. fetchSchedule and fetchActualSchedule both run
      // on mount and both assign colours; this one used to overwrite the map
      // wholesale, so whichever request finished last decided the palette and
      // a student's colour changed between loads.
      setStudentColors((prev) => {
        const newStudents = [...new Set(formattedLessons.map((l) => l.student_id))].filter((id) => !prev[id]);
        if (newStudents.length === 0) return prev;
        const colors: Record<string, string> = { ...prev };
        const existingCount = Object.keys(colors).length;
        newStudents.forEach((studentId, i) => {
          colors[studentId] = STUDENT_COLORS[(existingCount + i) % STUDENT_COLORS.length];
        });
        return colors;
      });
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
    setSelectedLesson(null);
    setConfirmAction(lesson.is_completed ? "incomplete" : "complete");
  }

  /**
   * Clicking a real lesson now marks it complete (or undoes it), which is
   * what the grid always looked like it did. The RPC is still the authority
   * on ORDER — it refuses anything that isn't the next completable lesson —
   * so this only has to ask, and translate the refusal.
   */
  function handleActualLessonClick(lesson: ActualLesson) {
    if (lesson.isGhost) return;
    setSelectedLesson(lesson);
    setSelectedTrialLesson(null);
    setConfirmAction(lesson.status === "completed" ? "incomplete" : "complete");
  }

  async function runComplete() {
    if (selectedLesson) return settleLesson(selectedLesson.id, "complete");
    if (selectedTrialLesson) return settleTrial(selectedTrialLesson.id, "complete");
  }

  async function runIncomplete() {
    if (selectedLesson) return settleLesson(selectedLesson.id, "incomplete");
    if (selectedTrialLesson) return settleTrial(selectedTrialLesson.id, "incomplete");
  }

  async function refreshAfterWrite() {
    clearWeekCache();
    await fetchSchedule();
    if (!showTemplate) await fetchActualSchedule();
  }

  function closeConfirm() {
    setSelectedTrialLesson(null);
    setSelectedLesson(null);
    setConfirmAction(null);
  }

  async function settleLesson(id: string, mode: "complete" | "incomplete") {
    setProcessing(true);
    try {
      const result = mode === "complete" ? await completeLesson(id) : await undoCompleteLesson(id);
      if (!result.success) throw new Error(translateLessonError(result.error));
      toast.success(mode === "complete" ? "Ders işlendi olarak işaretlendi" : "Ders geri alındı");
      await refreshAfterWrite();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız oldu");
    } finally {
      closeConfirm();
      setProcessing(false);
    }
  }

  async function settleTrial(id: string, mode: "complete" | "incomplete") {
    setProcessing(true);
    try {
      const result = mode === "complete" ? await completeTrialLesson(id) : await undoTrialLesson(id);
      if (!result.success) throw new Error(translateLessonError(result.error));
      toast.success(mode === "complete" ? "Deneme dersi işlendi olarak işaretlendi" : "Deneme dersi işlenmedi olarak işaretlendi");
      await refreshAfterWrite();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız oldu");
    } finally {
      closeConfirm();
      setProcessing(false);
    }
  }

  const timeSlots = computedTimeSlots;
  const isTrialTarget = !!selectedTrialLesson;

  // AlertDialogAction closes on click, but a genuine double-click fires both
  // handlers in the same tick before the close lands — and `processing` is
  // still false on the second one. useAsyncAction holds a ref as well as
  // state, so the second call never starts.
  const [completeAction] = useAsyncAction(runComplete);
  const [incompleteAction] = useAsyncAction(runIncomplete);

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
          <Button variant="ghost" size="icon" aria-label="Önceki hafta" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setWeekOffset(0)}>
              Bu Hafta
            </Button>
          )}
          <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-center">{weekLabel}</span>
          <Button variant="ghost" size="icon" aria-label="Sonraki hafta" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-2 border-outline-variant border-t-secondary" />
        </div>
      ) : lessons.length === 0 && actualLessons.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">Henüz planlanmış ders yok</div>
      ) : (
        <>
          {/* Day picker, phone only. A seven-column table needs ~900px to be
              legible, so on a phone the grid shows ONE day and this chooses
              which — instead of handing the teacher a horizontal scrollbar
              nested inside the dialog's vertical one. */}
          <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden">
            {DAYS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => setMobileDayIndex(i)}
                aria-pressed={mobileDayIndex === i}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border-2 px-3 text-sm font-semibold transition",
                  mobileDayIndex === i
                    ? "border-secondary bg-secondary text-on-secondary"
                    : "border-outline-variant bg-surface-container text-on-surface-variant",
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="mt-3 lg:overflow-x-auto">
            <table className="w-full border-collapse lg:min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-20 border bg-primary/10 p-2 text-sm font-semibold lg:w-24">Saat</th>
                  {DAYS.map((day, dayIndex) => (
                    <th
                      key={day}
                      className={cn(
                        "border bg-primary/10 p-2 text-sm font-semibold",
                        dayIndex !== mobileDayIndex && "hidden lg:table-cell",
                      )}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="border bg-muted/50 p-2 text-center font-mono text-sm tabular-nums">{formatTime(timeSlot)}</td>
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
                        className={dayIndex !== mobileDayIndex ? "hidden lg:table-cell" : undefined}
                        onActualLessonClick={handleActualLessonClick}
                        onTrialLessonClick={handleTrialLessonClick}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmSheet
        open={confirmAction === "complete"}
        onOpenChange={(o) => !o && closeConfirm()}
        tone="mint"
        destructive={false}
        title={isTrialTarget ? "Deneme Dersini İşle" : "Dersi İşle"}
        description={
          isTrialTarget
            ? "Bu deneme dersi işlendi olarak işaretlenecek."
            : `${selectedLesson?.student_name ?? "Bu öğrenci"} için bu ders işlendi olarak işaretlenecek; süresi bakiyeye eklenir.`
        }
        confirmLabel={processing ? "İşleniyor..." : "İşlendi Olarak İşaretle"}
        loading={processing}
        onConfirm={completeAction}
      />

      <ConfirmSheet
        open={confirmAction === "incomplete"}
        onOpenChange={(o) => !o && closeConfirm()}
        tone="peach"
        destructive={false}
        title="İşlendiyi Geri Al"
        description={isTrialTarget ? "Bu deneme dersinin işlendiği geri alınacak." : "Bu dersin işlendiği geri alınacak; bakiye de düzeltilir."}
        confirmLabel={processing ? "İşleniyor..." : "Geri Al"}
        loading={processing}
        onConfirm={incompleteAction}
      />
    </div>
  );
}
