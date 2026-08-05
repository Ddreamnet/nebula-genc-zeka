/**
 * Centralized lesson mutation service — the single write path for lesson
 * mutations. No component should directly update lesson_instances.status,
 * teacher_balance, or balance tracking.
 *
 * Every RPC comes in two flavors, matching the DB's teacher/admin split:
 *  - Teacher self-service (no teacherId param — the DB derives it from
 *    auth.uid() and requires the caller to actually hold the teacher role).
 *  - `admin*` — explicit teacherId, requires the caller to hold the admin
 *    role. Used when the admin panel acts on behalf of a teacher.
 * rpc_manual_balance_adjust has no teacher-initiated equivalent by design
 * (RLS never lets a teacher write their own balance) — it's admin-only.
 */

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { TemplateSlot } from "./instance-generation";

type RpcName = keyof Database["public"]["Functions"];

interface RpcResult {
  success: boolean;
  error?: string;
  duration_minutes?: number;
  new_cycle?: number;
  instances_created?: number;
  group_id?: string;
  cascaded?: boolean;
}

function slotsToJsonb(slots: TemplateSlot[]) {
  return slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }));
}

async function callRpc(name: RpcName, args: Record<string, unknown>): Promise<RpcResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc(name as any, args);
  if (error) {
    console.error(`${name} RPC error:`, error);
    return { success: false, error: error.message };
  }
  return data as unknown as RpcResult;
}

// ---------------------------------------------------------------------------
// Teacher self-service
// ---------------------------------------------------------------------------

export const completeLesson = (instanceId: string) => callRpc("rpc_complete_lesson", { p_instance_id: instanceId });

export const undoCompleteLesson = (instanceId: string) =>
  callRpc("rpc_undo_complete_lesson", { p_instance_id: instanceId });

export const resetPackage = (studentId: string, templateSlots: TemplateSlot[]) =>
  callRpc("rpc_reset_package", { p_student_id: studentId, p_template_slots: slotsToJsonb(templateSlots) });

export const syncStudentSchedule = (studentId: string, templateSlots: TemplateSlot[], lessonsPerWeek: number) =>
  callRpc("rpc_sync_student_schedule", {
    p_student_id: studentId,
    p_slots: slotsToJsonb(templateSlots),
    p_lessons_per_week: lessonsPerWeek,
  });

export const archiveStudent = (studentRecordId: string, studentUserId: string) =>
  callRpc("rpc_archive_student", { p_student_record_id: studentRecordId, p_student_user_id: studentUserId });

export const deleteStudent = (studentRecordId: string, studentUserId: string) =>
  callRpc("rpc_delete_student", { p_student_record_id: studentRecordId, p_student_user_id: studentUserId });

export const restoreStudent = (studentRecordId: string, studentUserId: string) =>
  callRpc("rpc_restore_student", { p_student_record_id: studentRecordId, p_student_user_id: studentUserId });

export const completeTrialLesson = (trialId: string) =>
  callRpc("rpc_complete_trial_lesson", { p_trial_id: trialId });

export const undoTrialLesson = (trialId: string) => callRpc("rpc_undo_trial_lesson", { p_trial_id: trialId });

export const toggleTopicCompletion = (topicId: string, isCompleted: boolean) =>
  callRpc("rpc_toggle_topic_completion", { p_topic_id: topicId, p_is_completed: isCompleted });

// ---------------------------------------------------------------------------
// Admin, on behalf of a teacher
// ---------------------------------------------------------------------------

export const adminCompleteLesson = (instanceId: string, teacherId: string) =>
  callRpc("rpc_admin_complete_lesson", { p_instance_id: instanceId, p_teacher_id: teacherId });

export const adminUndoCompleteLesson = (instanceId: string, teacherId: string) =>
  callRpc("rpc_admin_undo_complete_lesson", { p_instance_id: instanceId, p_teacher_id: teacherId });

export const adminResetPackage = (studentId: string, teacherId: string, templateSlots: TemplateSlot[]) =>
  callRpc("rpc_admin_reset_package", {
    p_student_id: studentId,
    p_teacher_id: teacherId,
    p_template_slots: slotsToJsonb(templateSlots),
  });

export const adminSyncStudentSchedule = (
  studentId: string,
  teacherId: string,
  templateSlots: TemplateSlot[],
  lessonsPerWeek: number,
) =>
  callRpc("rpc_admin_sync_student_schedule", {
    p_student_id: studentId,
    p_teacher_id: teacherId,
    p_slots: slotsToJsonb(templateSlots),
    p_lessons_per_week: lessonsPerWeek,
  });

export const adminArchiveStudent = (studentRecordId: string, studentUserId: string, teacherId: string) =>
  callRpc("rpc_admin_archive_student", {
    p_student_record_id: studentRecordId,
    p_student_user_id: studentUserId,
    p_teacher_id: teacherId,
  });

export const adminDeleteStudent = (studentRecordId: string, studentUserId: string, teacherId: string) =>
  callRpc("rpc_admin_delete_student", {
    p_student_record_id: studentRecordId,
    p_student_user_id: studentUserId,
    p_teacher_id: teacherId,
  });

export const adminRestoreStudent = (studentRecordId: string, studentUserId: string, teacherId: string) =>
  callRpc("rpc_admin_restore_student", {
    p_student_record_id: studentRecordId,
    p_student_user_id: studentUserId,
    p_teacher_id: teacherId,
  });

export const adminCompleteTrialLesson = (trialId: string, teacherId: string) =>
  callRpc("rpc_admin_complete_trial_lesson", { p_trial_id: trialId, p_teacher_id: teacherId });

export const adminUndoTrialLesson = (trialId: string, teacherId: string) =>
  callRpc("rpc_admin_undo_trial_lesson", { p_trial_id: trialId, p_teacher_id: teacherId });

export const adminToggleTopicCompletion = (topicId: string, teacherId: string, isCompleted: boolean) =>
  callRpc("rpc_admin_toggle_topic_completion", {
    p_topic_id: topicId,
    p_teacher_id: teacherId,
    p_is_completed: isCompleted,
  });

// ---------------------------------------------------------------------------
// Admin-only (no teacher-initiated equivalent exists — group management is
// an admin-panel-only feature by design, see the group lesson feature plan)
// ---------------------------------------------------------------------------

export const manualBalanceAdjust = (teacherId: string, amountMinutes: number, notes?: string) =>
  callRpc("rpc_manual_balance_adjust", {
    p_teacher_id: teacherId,
    p_amount_minutes: amountMinutes,
    p_notes: notes || null,
  });

export const adminCreateGroup = (teacherId: string, name: string) =>
  callRpc("rpc_admin_create_group", { p_teacher_id: teacherId, p_name: name });

export const adminRenameGroup = (groupId: string, teacherId: string, name: string) =>
  callRpc("rpc_admin_rename_group", { p_group_id: groupId, p_teacher_id: teacherId, p_name: name });

export const adminAddStudentToGroup = (studentRecordId: string, groupId: string, teacherId: string) =>
  callRpc("rpc_admin_add_student_to_group", {
    p_student_record_id: studentRecordId,
    p_group_id: groupId,
    p_teacher_id: teacherId,
  });

export const adminRemoveStudentFromGroup = (studentRecordId: string, teacherId: string) =>
  callRpc("rpc_admin_remove_student_from_group", {
    p_student_record_id: studentRecordId,
    p_teacher_id: teacherId,
  });

export const adminDeleteGroup = (groupId: string, teacherId: string) =>
  callRpc("rpc_admin_delete_group", { p_group_id: groupId, p_teacher_id: teacherId });

// ---------------------------------------------------------------------------
// Reads (plain RLS-scoped queries, no RPC involved)
// ---------------------------------------------------------------------------

export async function getNextCompletableInstance(
  studentId: string,
  teacherId: string,
  preloadedCycle?: number,
): Promise<{ id: string; lesson_number: number; lesson_date: string } | null> {
  const supabase = createClient();
  let currentCycle = preloadedCycle;
  if (currentCycle === undefined) {
    const { data: tracking } = await supabase
      .from("student_lesson_tracking")
      .select("package_cycle")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .maybeSingle();
    currentCycle = tracking?.package_cycle ?? 1;
  }

  const { data } = await supabase
    .from("lesson_instances")
    .select("id, lesson_number, lesson_date")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "planned")
    .eq("package_cycle", currentCycle)
    .order("lesson_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function getLastCompletedInstance(
  studentId: string,
  teacherId: string,
  preloadedCycle?: number,
): Promise<{ id: string; lesson_number: number; lesson_date: string } | null> {
  const supabase = createClient();
  let currentCycle = preloadedCycle;
  if (currentCycle === undefined) {
    const { data: tracking } = await supabase
      .from("student_lesson_tracking")
      .select("package_cycle")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .maybeSingle();
    currentCycle = tracking?.package_cycle ?? 1;
  }

  const { data } = await supabase
    .from("lesson_instances")
    .select("id, lesson_number, lesson_date")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "completed")
    .eq("package_cycle", currentCycle)
    .order("lesson_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function getRemainingRights(
  studentId: string,
  teacherId: string,
): Promise<{ total: number; completed: number; remaining: number; cycle: number }> {
  const supabase = createClient();

  const { count: templateCount } = await supabase
    .from("student_lessons")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId);

  const weeklyCount = templateCount ?? 0;
  const total = weeklyCount * 4;

  const { data: tracking } = await supabase
    .from("student_lesson_tracking")
    .select("package_cycle")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const currentCycle = tracking?.package_cycle ?? 1;

  const { count: completedCount } = await supabase
    .from("lesson_instances")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "completed")
    .eq("package_cycle", currentCycle);

  const completed = completedCount ?? 0;

  return {
    total,
    completed,
    remaining: Math.max(0, total - completed),
    cycle: currentCycle,
  };
}
