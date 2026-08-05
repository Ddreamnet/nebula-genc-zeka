/** Pure functions for lesson date calculation (date-walking algorithms). */

import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";

/**
 * Finds the next lesson date after a given date, based on the student's weekly pattern.
 * Day-of-week based only (slot-agnostic) — used for preview purposes only, not
 * actual instance generation.
 */
export function calculateNextLessonDate(currentDate: Date, lessonDays: number[]): Date | null {
  if (lessonDays.length === 0) return null;

  let nextDate = new Date(currentDate);
  nextDate.setHours(0, 0, 0, 0);
  nextDate = addDays(nextDate, 1);

  let attempts = 0;
  while (!lessonDays.includes(nextDate.getDay()) && attempts < 14) {
    nextDate = addDays(nextDate, 1);
    attempts++;
  }

  if (attempts >= 14) return null;
  return nextDate;
}

/**
 * Checks if a given date falls on a weekday present in the student's template slots.
 * Non-blocking warning only.
 */
export async function checkNonTemplateWeekday(
  studentId: string,
  teacherId: string,
  dateStr: string,
): Promise<{ isNonTemplate: boolean; templateDays: string[] }> {
  try {
    const supabase = createClient();
    const { data: templateSlots } = await supabase
      .from("student_lessons")
      .select("day_of_week")
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId);

    if (!templateSlots || templateSlots.length === 0) {
      return { isNonTemplate: false, templateDays: [] };
    }

    const templateDayNumbers = templateSlots.map((s) => s.day_of_week);
    const targetDate = new Date(dateStr);
    const targetDay = targetDate.getDay();

    const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const templateDayNames = templateDayNumbers.map((d) => dayNames[d]);

    return {
      isNonTemplate: !templateDayNumbers.includes(targetDay),
      templateDays: templateDayNames,
    };
  } catch {
    return { isNonTemplate: false, templateDays: [] };
  }
}
