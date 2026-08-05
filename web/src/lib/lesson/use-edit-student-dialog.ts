"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { startOfDay, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { LessonDates, LessonInstance } from "./types";
import {
  completeLesson,
  undoCompleteLesson,
  resetPackage,
  archiveStudent,
  deleteStudent,
  syncStudentSchedule,
  adminCompleteLesson,
  adminUndoCompleteLesson,
  adminResetPackage,
  adminArchiveStudent,
  adminDeleteStudent,
  adminSyncStudentSchedule,
  adminRemoveStudentFromGroup,
  getNextCompletableInstance,
  getLastCompletedInstance,
} from "./service";
import { type TemplateSlot, generateFutureInstanceDates, getSlotBefore } from "./instance-generation";
import { checkTeacherConflicts, type ConflictInfo } from "./conflict-detection";
import { checkNonTemplateWeekday } from "./date-calculation";
import { clearWeekCache } from "./week-cache";
import type { StudentLessonBase } from "@/lib/admin/types";

interface UseEditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentUpdated: () => void;
  studentId: string;
  currentName: string;
  currentLessons: StudentLessonBase[];
  /** true when opened from the admin panel (acting on behalf of a teacher) */
  asAdmin: boolean;
}

export function useEditStudentDialog({
  open,
  onOpenChange,
  onStudentUpdated,
  studentId,
  currentName,
  currentLessons,
  asAdmin,
}: UseEditStudentDialogProps) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [lessonsPerWeek, setLessonsPerWeek] = useState(1);
  const [lessons, setLessons] = useState<StudentLessonBase[]>([{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]);
  const [lessonDates, setLessonDates] = useState<LessonDates>({});
  const [originalLessonDates, setOriginalLessonDates] = useState<LessonDates>({});
  const [instances, setInstances] = useState<LessonInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updateRemainingDays, setUpdateRemainingDays] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [studentUserId, setStudentUserId] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [canShiftBackward, setCanShiftBackward] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  // Thin wrappers picking the teacher-self vs admin-on-behalf-of RPC family.
  const rpc = {
    completeLesson: (instanceId: string, teacherId: string) =>
      asAdmin ? adminCompleteLesson(instanceId, teacherId) : completeLesson(instanceId),
    undoCompleteLesson: (instanceId: string, teacherId: string) =>
      asAdmin ? adminUndoCompleteLesson(instanceId, teacherId) : undoCompleteLesson(instanceId),
    resetPackage: (sId: string, teacherId: string, slots: TemplateSlot[]) =>
      asAdmin ? adminResetPackage(sId, teacherId, slots) : resetPackage(sId, slots),
    archiveStudent: (recordId: string, sId: string, teacherId: string) =>
      asAdmin ? adminArchiveStudent(recordId, sId, teacherId) : archiveStudent(recordId, sId),
    deleteStudent: (recordId: string, sId: string, teacherId: string) =>
      asAdmin ? adminDeleteStudent(recordId, sId, teacherId) : deleteStudent(recordId, sId),
    syncStudentSchedule: (sId: string, teacherId: string, slots: TemplateSlot[], perWeek: number) =>
      asAdmin
        ? adminSyncStudentSchedule(sId, teacherId, slots, perWeek)
        : syncStudentSchedule(sId, slots, perWeek),
  };

  useEffect(() => {
    if (open) {
      setName(currentName);
      setLessonsPerWeek(currentLessons.length || 1);
      setLessons(currentLessons.length > 0 ? currentLessons : [{ dayOfWeek: 1, startTime: "", endTime: "", note: "" }]);
      setConflicts([]);
      initializeDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentName, currentLessons]);

  async function initializeDialog() {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("student_id, teacher_id, group_id")
        .eq("id", studentId)
        .single();

      if (error || !data) return;

      const sUserId = data.student_id;
      const tUserId = data.teacher_id;
      setStudentUserId(sUserId);
      setTeacherUserId(tUserId);
      setGroupId(data.group_id ?? null);

      const [trackingResult, instanceResult] = await Promise.all([
        supabase
          .from("student_lesson_tracking")
          .select("package_cycle")
          .eq("student_id", sUserId)
          .eq("teacher_id", tUserId)
          .maybeSingle(),
        supabase
          .from("lesson_instances")
          .select("*")
          .eq("student_id", sUserId)
          .eq("teacher_id", tUserId)
          .in("status", ["planned", "completed"])
          .order("lesson_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

      const currentCycle = trackingResult.data?.package_cycle ?? 1;
      const allInstances = (instanceResult.data ?? []) as LessonInstance[];
      const fetchedInstances = allInstances.filter((i) => i.package_cycle === currentCycle);
      setInstances(fetchedInstances);

      const dates: LessonDates = {};
      fetchedInstances.forEach((inst) => {
        dates[inst.lesson_number.toString()] = inst.lesson_date;
      });
      setLessonDates(dates);
      setOriginalLessonDates(dates);
    } catch (error) {
      console.error("Failed to initialize dialog:", error);
    }
  }

  async function fetchInstances() {
    if (!studentUserId || !teacherUserId) return;
    try {
      const [trackingResult, instanceResult] = await Promise.all([
        supabase
          .from("student_lesson_tracking")
          .select("package_cycle")
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId)
          .maybeSingle(),
        supabase
          .from("lesson_instances")
          .select("*")
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId)
          .in("status", ["planned", "completed"])
          .order("lesson_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

      const currentCycle = trackingResult.data?.package_cycle ?? 1;
      const allInstances = (instanceResult.data ?? []) as LessonInstance[];
      const fetchedInstances = allInstances.filter((i) => i.package_cycle === currentCycle);
      setInstances(fetchedInstances);

      const dates: LessonDates = {};
      fetchedInstances.forEach((inst) => {
        dates[inst.lesson_number.toString()] = inst.lesson_date;
      });
      setLessonDates(dates);
      setOriginalLessonDates(dates);
    } catch (error) {
      console.error("Failed to fetch lesson instances:", error);
    }
  }

  useEffect(() => {
    if (lessonsPerWeek > lessons.length) {
      const newLessons = [...lessons];
      for (let i = lessons.length; i < lessonsPerWeek; i++) {
        newLessons.push({ dayOfWeek: 1, startTime: "", endTime: "", note: "" });
      }
      setLessons(newLessons);
    } else if (lessonsPerWeek < lessons.length) {
      setLessons(lessons.slice(0, lessonsPerWeek));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonsPerWeek]);

  function updateLesson(index: number, field: keyof StudentLessonBase, value: string | number) {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  }

  // Instance ID map for direct DB updates
  const instanceIdMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    if (instances.length > 0) {
      const sorted = [...instances].sort((a, b) => {
        const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
      sorted.forEach((inst) => {
        map[inst.lesson_number.toString()] = inst.id;
      });
    }
    return map;
  }, [instances]);

  function updateLessonDate(lessonNumber: number, dateStr: string) {
    setLessonDates({ ...lessonDates, [lessonNumber.toString()]: dateStr });
  }

  function findInstanceForLesson(lessonNumber: number): LessonInstance | undefined {
    return instances.find((inst) => inst.lesson_number === lessonNumber);
  }

  function handleDateSubmit() {
    const hasChanges = Object.keys(lessonDates).some((key) => lessonDates[key] !== originalLessonDates[key]);
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      toast("Hiçbir değişiklik yapılmadı");
    }
  }

  async function handleMarkLastLesson() {
    try {
      const nextInst = await getNextCompletableInstance(studentUserId, teacherUserId);
      if (!nextInst) {
        toast("İşlenecek ders kalmadı");
        return;
      }
      const result = await rpc.completeLesson(nextInst.id, teacherUserId);
      if (!result.success) {
        toast.error(result.error ?? "Ders işaretlenemedi");
        return;
      }
      await fetchInstances();
      toast.success("Ders işaretlendi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ders işaretlenemedi");
    }
  }

  async function handleUndoLastLesson() {
    try {
      const lastInst = await getLastCompletedInstance(studentUserId, teacherUserId);
      if (!lastInst) {
        toast("Geri alınacak ders yok");
        return;
      }
      const result = await rpc.undoCompleteLesson(lastInst.id, teacherUserId);
      if (!result.success) {
        toast.error(result.error ?? "Ders geri alınamadı");
        return;
      }
      await fetchInstances();
      toast.success("Son ders geri alındı");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ders geri alınamadı");
    }
  }

  async function handleResetAllLessons() {
    try {
      const templateSlots: TemplateSlot[] = lessons.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        startTime: l.startTime,
        endTime: l.endTime,
      }));
      const result = await rpc.resetPackage(studentUserId, teacherUserId, templateSlots);
      if (!result.success) {
        toast.error(result.error ?? "Dersler sıfırlanamadı");
        return;
      }
      setLessonDates({});
      setOriginalLessonDates({});
      setShowResetConfirm(false);
      await fetchInstances();
      toast.success(`Paket sıfırlandı (Yeni döngü: ${result.new_cycle}). ${result.instances_created} ders planlandı.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dersler sıfırlanamadı");
    }
  }

  /** Shared logic for batch date updates with conflict checks.
   *  When a date changes, also re-maps start_time/end_time to the
   *  matching template slot for the new day-of-week so the time
   *  chain stays consistent with the schedule. */
  async function batchUpdateInstances(changedKeys: string[], finalDatesRef: { current: LessonDates }) {
    const changeEntries = changedKeys
      .map((key) => {
        const instId = instanceIdMap[key];
        const inst = instId ? instances.find((i) => i.id === instId) : findInstanceForLesson(parseInt(key));
        return { key, inst };
      })
      .filter((e) => e.inst != null);

    const templateSlots: TemplateSlot[] = lessons
      .map((l) => ({ dayOfWeek: l.dayOfWeek, startTime: l.startTime, endTime: l.endTime }))
      .sort((a, b) => (a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime)));

    const usedSlotsPerDate: Record<string, number> = {};
    const updates = changeEntries.map((e) => {
      const newDate = finalDatesRef.current[e.key];
      const newDow = new Date(newDate + "T00:00:00").getDay();
      const matchingSlots = templateSlots.filter((s) => s.dayOfWeek === newDow);

      const usedCount = usedSlotsPerDate[newDate] || 0;
      const slotIdx = Math.min(usedCount, Math.max(0, matchingSlots.length - 1));
      const matchedSlot = matchingSlots[slotIdx];
      usedSlotsPerDate[newDate] = usedCount + 1;

      return {
        ...e,
        newStartTime: matchedSlot?.startTime || e.inst!.start_time,
        newEndTime: matchedSlot?.endTime || e.inst!.end_time,
      };
    });

    const updatingIds = updates.map((u) => u.inst!.id);
    const conflictResults = await Promise.all(
      updates.map((u) =>
        checkTeacherConflicts(teacherUserId, finalDatesRef.current[u.key], u.newStartTime, u.newEndTime, updatingIds),
      ),
    );
    const allConflicts = conflictResults.flat();
    if (allConflicts.length > 0) {
      setConflicts(allConflicts);
      throw new Error("Çakışma var, dersler taşınamadı");
    }

    const batchResults = await Promise.all(
      updates.map((u) =>
        supabase
          .from("lesson_instances")
          .update({
            lesson_date: finalDatesRef.current[u.key],
            start_time: u.newStartTime,
            end_time: u.newEndTime,
            original_date: u.inst!.original_date || u.inst!.lesson_date,
            original_start_time: u.inst!.original_start_time || u.inst!.start_time,
            original_end_time: u.inst!.original_end_time || u.inst!.end_time,
            rescheduled_count: u.inst!.rescheduled_count + 1,
          })
          .eq("id", u.inst!.id),
      ),
    );
    const batchErrors = batchResults.filter((r) => r.error);
    if (batchErrors.length > 0) {
      throw new Error(`Instance güncelleme hatası: ${batchErrors.map((e) => e.error?.message).join(", ")}`);
    }

    return updates;
  }

  async function confirmDateUpdate() {
    try {
      const finalDatesRef = { current: { ...lessonDates } };
      const changedKeys = Object.keys(lessonDates).filter((key) => lessonDates[key] !== originalLessonDates[key]);

      if (updateRemainingDays && changedKeys.length > 0 && instances.length > 0) {
        const updates = await batchUpdateInstances(changedKeys, finalDatesRef);

        const templateSlots: TemplateSlot[] = lessons.map((l) => ({
          dayOfWeek: l.dayOfWeek,
          startTime: l.startTime,
          endTime: l.endTime,
        }));

        const allSorted = [...instances].sort((a, b) => {
          const dc = a.lesson_date.localeCompare(b.lesson_date);
          return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
        });

        const changedInstanceIds = new Set(changedKeys.map((k) => instanceIdMap[k]).filter(Boolean));
        let lastChangedIdx = -1;
        allSorted.forEach((inst, idx) => {
          if (changedInstanceIds.has(inst.id)) lastChangedIdx = idx;
        });

        const plannedAfterChanged = allSorted.slice(lastChangedIdx + 1).filter((inst) => inst.status === "planned");

        if (plannedAfterChanged.length > 0) {
          const lastChangedKey = changedKeys.reduce((a, b) => (Number(a) > Number(b) ? a : b));
          const lastChangedDate = new Date(lessonDates[lastChangedKey]);
          const startDate = new Date(lastChangedDate);

          const lastUpdate = updates.find((u) => u.key === lastChangedKey);
          const afterTime = lastUpdate?.newStartTime;

          const futureDates = generateFutureInstanceDates(templateSlots, plannedAfterChanged.length, startDate, afterTime);

          const tailIds = plannedAfterChanged.map((p) => p.id);
          const futureConflictResults = await Promise.all(
            futureDates.map((fd) => checkTeacherConflicts(teacherUserId, fd.lessonDate, fd.startTime, fd.endTime, tailIds)),
          );
          const futureConflicts = futureConflictResults.flat();
          if (futureConflicts.length > 0) {
            setConflicts(futureConflicts);
            throw new Error("Çakışma var, kalan dersler taşınamadı");
          }

          const updateCount = Math.min(plannedAfterChanged.length, futureDates.length);
          const remainingResults = await Promise.all(
            Array.from({ length: updateCount }, (_, i) =>
              supabase
                .from("lesson_instances")
                .update({
                  lesson_date: futureDates[i].lessonDate,
                  start_time: futureDates[i].startTime,
                  end_time: futureDates[i].endTime,
                })
                .eq("id", plannedAfterChanged[i].id),
            ),
          );
          const remainingErrors = remainingResults.filter((r) => r.error);
          if (remainingErrors.length > 0) {
            throw new Error(`Kalan dersler güncelleme hatası: ${remainingErrors.map((e) => e.error?.message).join(", ")}`);
          }

          for (let i = 0; i < updateCount; i++) {
            finalDatesRef.current[plannedAfterChanged[i].lesson_number.toString()] = futureDates[i].lessonDate;
          }
        }
      } else if (changedKeys.length > 0) {
        await batchUpdateInstances(changedKeys, finalDatesRef);
      }

      clearWeekCache();
      await fetchInstances();
      onStudentUpdated();
      toast.success("Ders tarihleri güncellendi");

      const changedKeysForWarning = Object.keys(lessonDates).filter((key) => lessonDates[key] !== originalLessonDates[key]);
      for (const key of changedKeysForWarning) {
        const check = await checkNonTemplateWeekday(studentUserId, teacherUserId, lessonDates[key]);
        if (check.isNonTemplate) {
          toast(`Seçilen tarih (${lessonDates[key]}) şablon ders günlerinden (${check.templateDays.join(", ")}) farklı bir güne denk geliyor.`);
          break;
        }
      }

      setShowConfirm(false);
      setUpdateRemainingDays(false);
      setConflicts([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tarihler güncellenemedi");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Öğrenci adı gereklidir");
      return;
    }
    if (!lessons.every((lesson) => lesson.dayOfWeek !== undefined && lesson.startTime && lesson.endTime)) {
      toast.error("Tüm ders programı alanlarını doldurun");
      return;
    }

    setLoading(true);
    setConflicts([]);

    try {
      const { error: profileError } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("user_id", studentUserId);
      if (profileError) throw profileError;

      const templateChanged =
        lessonsPerWeek !== currentLessons.length ||
        lessons.length !== currentLessons.length ||
        lessons.some((l, i) => {
          const curr = currentLessons[i];
          if (!curr) return true;
          return l.dayOfWeek !== curr.dayOfWeek || l.startTime !== curr.startTime || l.endTime !== curr.endTime;
        });

      if (templateChanged) {
        const slots: TemplateSlot[] = lessons.map((l) => ({ dayOfWeek: l.dayOfWeek, startTime: l.startTime, endTime: l.endTime }));
        const result = await rpc.syncStudentSchedule(studentUserId, teacherUserId, slots, lessonsPerWeek);
        if (!result.success) throw new Error(result.error ?? "Schedule sync failed");
      } else {
        const { error: trackingError } = await supabase
          .from("student_lesson_tracking")
          .update({ lessons_per_week: lessonsPerWeek })
          .eq("student_id", studentUserId)
          .eq("teacher_id", teacherUserId);
        if (trackingError) throw trackingError;

        // Independent per-slot updates — safe to run in parallel. Previously
        // ran sequentially with no error check at all, so a failed note
        // update on any slot was silently swallowed while the toast still
        // claimed success.
        const noteResults = await Promise.all(
          lessons.map((lesson) =>
            supabase
              .from("student_lessons")
              .update({ note: lesson.note || null })
              .eq("student_id", studentUserId)
              .eq("teacher_id", teacherUserId)
              .eq("day_of_week", lesson.dayOfWeek)
              .eq("start_time", lesson.startTime),
          ),
        );
        const failedNote = noteResults.find((r) => r.error);
        if (failedNote?.error) throw failedNote.error;
      }

      toast.success("Öğrenci ayarları güncellendi");
      clearWeekCache();
      onStudentUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğrenci ayarları güncellenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStudent() {
    setLoading(true);
    try {
      const result = await rpc.deleteStudent(studentId, studentUserId, teacherUserId);
      if (!result.success) throw new Error(result.error ?? "Öğrenci silinemedi");
      toast.success("Öğrenci ve tüm verileri silindi");
      clearWeekCache();
      onStudentUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğrenci silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveStudent() {
    setLoading(true);
    try {
      const result = await rpc.archiveStudent(studentId, studentUserId, teacherUserId);
      if (!result.success) throw new Error(result.error ?? "Arşivleme başarısız");
      toast.success("Öğrenci arşivlendi");
      clearWeekCache();
      onStudentUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Arşivleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  // Group management is admin-only by design (see the group lesson feature
  // plan) — there is no teacher-initiated equivalent, so this always calls
  // the admin RPC regardless of `asAdmin` (this dialog is admin-only today).
  async function handleRemoveFromGroup() {
    setLoading(true);
    try {
      const result = await adminRemoveStudentFromGroup(studentId, teacherUserId);
      if (!result.success) throw new Error(result.error ?? "Gruptan çıkarma başarısız");
      toast.success("Öğrenci gruptan çıkarıldı");
      setGroupId(null);
      onStudentUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gruptan çıkarma başarısız");
    } finally {
      setLoading(false);
    }
  }

  // =============================================
  // Chain control helpers
  // =============================================

  const getTemplateSlots = (): TemplateSlot[] => lessons.map((l) => ({ dayOfWeek: l.dayOfWeek, startTime: l.startTime, endTime: l.endTime }));

  /** Fetch the absolute last completed instance across ALL cycles for this student.
   *  This is the cross-cycle anchor used for backward boundary and realign. */
  async function fetchLastCompletedAnchor(): Promise<{ lessonDate: string; startTime: string } | null> {
    if (!studentUserId || !teacherUserId) return null;
    const { data } = await supabase
      .from("lesson_instances")
      .select("lesson_date, start_time")
      .eq("student_id", studentUserId)
      .eq("teacher_id", teacherUserId)
      .eq("status", "completed")
      .order("lesson_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return { lessonDate: data[0].lesson_date, startTime: data[0].start_time };
    return null;
  }

  /** Compute the minimum allowed slot (boundary for backward + realign). */
  async function computeMinSlot() {
    const templateSlots = getTemplateSlots();
    const anchor = await fetchLastCompletedAnchor();
    if (anchor) {
      const result = generateFutureInstanceDates(templateSlots, 1, new Date(anchor.lessonDate), anchor.startTime);
      return result[0] || null;
    }
    const result = generateFutureInstanceDates(templateSlots, 1, startOfDay(new Date()));
    return result[0] || null;
  }

  /** Get planned instances eligible for chain operations (excluding manual overrides) */
  const getRealignableInstances = () =>
    [...instances]
      .filter((i) => i.status === "planned" && !i.is_manual_override)
      .sort((a, b) => {
        const dc = a.lesson_date.localeCompare(b.lesson_date);
        return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
      });

  /** Re-sequence lesson_number for all instances by date+time order */
  async function resequenceLessonNumbers(currentInstances: LessonInstance[]) {
    const sorted = [...currentInstances].sort((a, b) => {
      const dc = a.lesson_date.localeCompare(b.lesson_date);
      return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
    });
    const updates = sorted
      .map((inst, idx) => ({ id: inst.id, newNum: idx + 1, oldNum: inst.lesson_number }))
      .filter((u) => u.newNum !== u.oldNum);
    if (updates.length === 0) return;
    await Promise.all(updates.map((u) => supabase.from("lesson_instances").update({ lesson_number: u.newNum }).eq("id", u.id)));
  }

  /** Realign: regenerate all planned chain from the last completed anchor (cross-cycle) */
  async function handleRealignChain() {
    const realignable = getRealignableInstances();
    if (realignable.length === 0) {
      toast("Hizalanacak planlı ders yok");
      return;
    }
    setShifting(true);
    try {
      const templateSlots = getTemplateSlots();
      const anchor = await fetchLastCompletedAnchor();
      let startDate: Date;
      let afterTime: string | undefined;
      if (anchor) {
        startDate = new Date(anchor.lessonDate);
        afterTime = anchor.startTime;
      } else {
        startDate = startOfDay(new Date());
      }

      const newDates = generateFutureInstanceDates(templateSlots, realignable.length, startDate, afterTime);

      const snapshot = [...instances];
      const updatedInstances = instances.map((inst) => {
        const idx = realignable.findIndex((r) => r.id === inst.id);
        if (idx === -1 || idx >= newDates.length) return inst;
        return { ...inst, lesson_date: newDates[idx].lessonDate, start_time: newDates[idx].startTime, end_time: newDates[idx].endTime };
      });
      setInstances(updatedInstances);

      const results = await Promise.all(
        realignable
          .slice(0, newDates.length)
          .map((inst, i) =>
            supabase
              .from("lesson_instances")
              .update({ lesson_date: newDates[i].lessonDate, start_time: newDates[i].startTime, end_time: newDates[i].endTime })
              .eq("id", inst.id),
          ),
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        setInstances(snapshot);
        throw new Error(errors.map((e) => e.error?.message).join(", "));
      }

      await resequenceLessonNumbers(updatedInstances);
      clearWeekCache();
      onStudentUpdated();
      await fetchInstances();
      toast.success("Ders zinciri yeniden hizalandı");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hizalama başarısız");
    } finally {
      setShifting(false);
    }
  }

  /** Shift chain forward by 1 slot */
  async function handleShiftForward() {
    const realignable = getRealignableInstances();
    if (realignable.length === 0) return;
    setShifting(true);
    try {
      const templateSlots = getTemplateSlots();
      const first = realignable[0];
      const newDates = generateFutureInstanceDates(templateSlots, realignable.length, new Date(first.lesson_date), first.start_time);

      const snapshot = [...instances];
      const updatedInstances = instances.map((inst) => {
        const idx = realignable.findIndex((r) => r.id === inst.id);
        if (idx === -1 || idx >= newDates.length) return inst;
        return { ...inst, lesson_date: newDates[idx].lessonDate, start_time: newDates[idx].startTime, end_time: newDates[idx].endTime };
      });
      setInstances(updatedInstances);

      const results = await Promise.all(
        realignable
          .slice(0, newDates.length)
          .map((inst, i) =>
            supabase
              .from("lesson_instances")
              .update({ lesson_date: newDates[i].lessonDate, start_time: newDates[i].startTime, end_time: newDates[i].endTime })
              .eq("id", inst.id),
          ),
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        setInstances(snapshot);
        throw new Error(errors.map((e) => e.error?.message).join(", "));
      }

      await resequenceLessonNumbers(updatedInstances);
      clearWeekCache();
      onStudentUpdated();
      await fetchInstances();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İleri kaydırma başarısız");
    } finally {
      setShifting(false);
    }
  }

  /** Shift chain backward by 1 slot, respecting completed boundary */
  async function handleShiftBackward() {
    const realignable = getRealignableInstances();
    if (realignable.length === 0) return;
    setShifting(true);
    try {
      const templateSlots = getTemplateSlots();
      const first = realignable[0];

      const prevSlot = getSlotBefore(templateSlots, new Date(first.lesson_date), first.start_time);
      if (!prevSlot) {
        toast("Daha geriye kaydırılamaz");
        setShifting(false);
        return;
      }

      const minSlot = await computeMinSlot();
      if (minSlot) {
        const prevDateStr = format(prevSlot.date, "yyyy-MM-dd");
        if (prevDateStr < minSlot.lessonDate || (prevDateStr === minSlot.lessonDate && prevSlot.startTime < minSlot.startTime)) {
          toast("Son işlenen dersin ötesine geri kaydırılamaz");
          setShifting(false);
          return;
        }
      }

      const newDates = generateFutureInstanceDates(templateSlots, realignable.length, prevSlot.date, undefined);
      const filteredDates: typeof newDates = [];
      for (const nd of newDates) {
        if (filteredDates.length >= realignable.length) break;
        if (nd.lessonDate === format(prevSlot.date, "yyyy-MM-dd") && nd.startTime < prevSlot.startTime) continue;
        filteredDates.push(nd);
      }

      if (filteredDates.length === 0) {
        toast("Daha geriye kaydırılamaz");
        setShifting(false);
        return;
      }

      const snapshot = [...instances];
      const updatedInstances = instances.map((inst) => {
        const idx = realignable.findIndex((r) => r.id === inst.id);
        if (idx === -1 || idx >= filteredDates.length) return inst;
        return { ...inst, lesson_date: filteredDates[idx].lessonDate, start_time: filteredDates[idx].startTime, end_time: filteredDates[idx].endTime };
      });
      setInstances(updatedInstances);

      const results = await Promise.all(
        realignable
          .slice(0, filteredDates.length)
          .map((inst, i) =>
            supabase
              .from("lesson_instances")
              .update({ lesson_date: filteredDates[i].lessonDate, start_time: filteredDates[i].startTime, end_time: filteredDates[i].endTime })
              .eq("id", inst.id),
          ),
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        setInstances(snapshot);
        throw new Error(errors.map((e) => e.error?.message).join(", "));
      }

      await resequenceLessonNumbers(updatedInstances);
      clearWeekCache();
      onStudentUpdated();
      await fetchInstances();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Geri kaydırma başarısız");
    } finally {
      setShifting(false);
    }
  }

  /**
   * Recompute canShiftBackward whenever instances or the actual schedule
   * (day/time) changes. Keyed on scheduleSlotsKey rather than `lessons`
   * directly: updateLesson() gives `lessons` a new array reference on every
   * keystroke, including in the free-text note field, which previously
   * re-ran this effect — and its live Supabase query via computeMinSlot() /
   * fetchLastCompletedAnchor() — once per character typed. getTemplateSlots()
   * already ignores `note` for the actual check, so this key does too.
   */
  const scheduleSlotsKey = lessons.map((l) => `${l.dayOfWeek}|${l.startTime}|${l.endTime}`).join(",");
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const realignable = getRealignableInstances();
      if (realignable.length === 0) {
        setCanShiftBackward(false);
        return;
      }
      const templateSlots = getTemplateSlots();
      const first = realignable[0];
      const prevSlot = getSlotBefore(templateSlots, new Date(first.lesson_date), first.start_time);
      if (!prevSlot) {
        setCanShiftBackward(false);
        return;
      }
      const minSlot = await computeMinSlot();
      if (!minSlot) {
        setCanShiftBackward(false);
        return;
      }
      const prevDateStr = format(prevSlot.date, "yyyy-MM-dd");
      const allowed = !(prevDateStr < minSlot.lessonDate || (prevDateStr === minSlot.lessonDate && prevSlot.startTime < minSlot.startTime));
      if (!cancelled) setCanShiftBackward(allowed);
    };
    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, scheduleSlotsKey]);

  const hasRealignableInstances = getRealignableInstances().length > 0;

  const completedCount = instances.filter((i) => i.status === "completed").length;
  const totalLessons = lessonsPerWeek * 4;

  const sortedLessonsForDisplay = (() => {
    const sorted = [...instances].sort((a, b) => {
      const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });

    const result = sorted.map((inst, idx) => ({
      displayIndex: idx + 1,
      lessonNumber: inst.lesson_number,
      effectiveDate: inst.lesson_date,
      startTime: inst.start_time,
      endTime: inst.end_time,
      isCompleted: inst.status === "completed",
      isOverridden: inst.original_date !== null,
      instanceId: inst.id as string | undefined,
    }));

    for (let i = result.length; i < totalLessons; i++) {
      result.push({
        displayIndex: i + 1,
        lessonNumber: i + 1,
        effectiveDate: "",
        startTime: "",
        endTime: "",
        isCompleted: false,
        isOverridden: false,
        instanceId: undefined,
      });
    }

    return result;
  })();

  function handleLessonsPerWeekChange(newCount: number) {
    const newTotal = newCount * 4;
    if (newTotal < completedCount) {
      toast.error(`Haftalık ders sayısı ${newCount}'e düşürülemez çünkü bu döngüde zaten ${completedCount} ders tamamlanmış (toplam hak: ${newTotal}).`);
      return;
    }
    setLessonsPerWeek(newCount);
  }

  return {
    name,
    setName,
    lessonsPerWeek,
    lessons,
    lessonDates,
    originalLessonDates,
    loading,
    shifting,
    showConfirm,
    setShowConfirm,
    showResetConfirm,
    setShowResetConfirm,
    updateRemainingDays,
    setUpdateRemainingDays,
    conflicts,
    completedCount,
    totalLessons,
    sortedLessonsForDisplay,
    canShiftBackward,
    hasRealignableInstances,
    groupId,

    handleLessonsPerWeekChange,
    updateLesson,
    updateLessonDate,
    handleDateSubmit,
    handleMarkLastLesson,
    handleUndoLastLesson,
    handleResetAllLessons,
    confirmDateUpdate,
    handleSubmit,
    handleDeleteStudent,
    handleArchiveStudent,
    handleRemoveFromGroup,
    handleRealignChain,
    handleShiftForward,
    handleShiftBackward,
  };
}
