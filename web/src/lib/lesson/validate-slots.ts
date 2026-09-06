import type { StudentLessonBase } from "@/lib/admin/types";

/**
 * One validator for a weekly template, shared by the create and the edit
 * dialog. Both used to check only "is the field non-empty?", independently,
 * and neither checked the one thing that actually costs money.
 *
 * Why end > start is not cosmetic: rpc_complete_lesson_internal pays the
 * teacher with `EXTRACT(EPOCH FROM (end_time - start_time)) / 60`, so a slot
 * saved as 15:00-14:00 SUBTRACTS an hour from teacher_balance and writes a
 * negative balance_events row. The database now refuses it outright (see
 * migration 20260905093000); this exists so the teacher gets a sentence they
 * can act on instead of a Postgres constraint name.
 *
 * Returns a ready-to-toast message, or null when the slots are usable.
 */
export function validateLessonSlots(lessons: StudentLessonBase[]): string | null {
  if (lessons.length === 0) return "En az bir ders saati gerekli";

  for (const [i, lesson] of lessons.entries()) {
    const n = i + 1;
    if (lesson.dayOfWeek === undefined || !lesson.startTime || !lesson.endTime) {
      return "Tüm ders programı alanlarını doldurun";
    }
    if (lesson.endTime <= lesson.startTime) {
      // "HH:MM" strings compare correctly lexicographically, which is also how
      // Postgres orders the `time` values these become.
      return `${n}. ders: bitiş saati (${lesson.endTime}) başlangıçtan (${lesson.startTime}) sonra olmalı`;
    }
    if (lesson.meetingUrl && !/^https:\/\/\S+$/.test(lesson.meetingUrl.trim())) {
      return `${n}. ders: ders linki https:// ile başlamalı`;
    }
  }

  // Two slots on the same day that overlap are the teacher double-booking
  // themselves against their OWN student — checkTeacherConflicts only ever
  // looks at other people's rows, so nothing caught this before.
  const byDay = new Map<number, StudentLessonBase[]>();
  for (const lesson of lessons) {
    const list = byDay.get(lesson.dayOfWeek) ?? [];
    list.push(lesson);
    byDay.set(lesson.dayOfWeek, list);
  }
  for (const sameDay of byDay.values()) {
    const sorted = [...sameDay].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      // Back-to-back (previous end === next start) is allowed, matching
      // hasTimeOverlap() in conflict-detection.ts.
      if (sorted[i].startTime < sorted[i - 1].endTime) {
        return `Aynı gün içinde çakışan iki ders var: ${sorted[i - 1].startTime}-${sorted[i - 1].endTime} ve ${sorted[i].startTime}-${sorted[i].endTime}`;
      }
    }
  }

  return null;
}

/**
 * Cryptographically random temporary password.
 *
 * Replaces a Math.random() loop. Math.random is seeded from a value an
 * attacker can often recover from other outputs of the same page, and these
 * strings are the only credential a child account has until they change it.
 * The alphabet drops the characters people misread out loud (0/O, 1/l/I),
 * because these get read to a parent over the phone.
 */
export function generateTempPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  // Rejection-free and unbiased enough here: 2^32 % 55 skews the last few
  // symbols by ~1e-8, which is irrelevant for a password this length.
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
