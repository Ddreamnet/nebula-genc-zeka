/**
 * Interval-based conflict detection for teacher schedules.
 * Checks lesson_instances + trial_lessons for time overlaps.
 * Back-to-back (endA == startB) is NOT a conflict.
 */

import { createClient } from "@/lib/supabase/client";

export interface ConflictInfo {
  studentName: string;
  date: string;
  timeRange: string;
  type: "lesson" | "trial";
  teacherId: string;
}

/**
 * Core overlap check: overlap if startA < endB AND endA > startB.
 * Back-to-back (endA == startB or endB == startA) is allowed.
 */
export function hasTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

/**
 * Check a teacher's ACTUAL schedule for conflicts on a given date + time range.
 * Queries lesson_instances (planned/completed) and trial_lessons.
 *
 * Pass `excludeInstanceIds` to ignore the row(s) currently being moved/edited
 * (a single edit passes one id; a batch shift passes every id in the batch).
 */
export async function checkTeacherConflicts(
  teacherId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeInstanceIds: string | string[] = [],
): Promise<ConflictInfo[]> {
  const supabase = createClient();
  const conflicts: ConflictInfo[] = [];
  const excludeIds = Array.isArray(excludeInstanceIds)
    ? excludeInstanceIds.filter(Boolean)
    : excludeInstanceIds
      ? [excludeInstanceIds]
      : [];

  let instanceQuery = supabase
    .from("lesson_instances")
    .select("id, student_id, start_time, end_time")
    .eq("teacher_id", teacherId)
    .eq("lesson_date", date)
    .in("status", ["planned", "completed"]);

  if (excludeIds.length === 1) {
    instanceQuery = instanceQuery.neq("id", excludeIds[0]);
  } else if (excludeIds.length > 1) {
    instanceQuery = instanceQuery.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data: instances } = await instanceQuery;

  if (instances && instances.length > 0) {
    // Exclude archived students from conflict reporting — their old completed
    // rows live on for balance integrity but shouldn't block new scheduling.
    const studentIds = [...new Set(instances.map((i) => i.student_id))];
    const { data: activeRows } = await supabase
      .from("students")
      .select("student_id")
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .in("student_id", studentIds);
    const activeIds = new Set((activeRows ?? []).map((r) => r.student_id));
    const activeInstances = instances.filter((i) => activeIds.has(i.student_id));

    if (activeInstances.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", [...new Set(activeInstances.map((i) => i.student_id))]);

      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

      for (const inst of activeInstances) {
        if (hasTimeOverlap(startTime, endTime, inst.start_time, inst.end_time)) {
          conflicts.push({
            studentName: nameMap.get(inst.student_id) ?? "Bilinmeyen Öğrenci",
            date,
            timeRange: `${inst.start_time.slice(0, 5)} - ${inst.end_time.slice(0, 5)}`,
            type: "lesson",
            teacherId,
          });
        }
      }
    }
  }

  const { data: trials } = await supabase
    .from("trial_lessons")
    .select("id, start_time, end_time")
    .eq("teacher_id", teacherId)
    .eq("lesson_date", date);

  if (trials) {
    for (const trial of trials) {
      if (hasTimeOverlap(startTime, endTime, trial.start_time, trial.end_time)) {
        conflicts.push({
          studentName: "Deneme Dersi",
          date,
          timeRange: `${trial.start_time.slice(0, 5)} - ${trial.end_time.slice(0, 5)}`,
          type: "trial",
          teacherId,
        });
      }
    }
  }

  return conflicts;
}
