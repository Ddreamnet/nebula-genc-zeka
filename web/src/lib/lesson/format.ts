export function formatTime(time: string): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
}

/** 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi */
export function getDayName(dayOfWeek?: number): string {
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return dayOfWeek !== undefined ? days[dayOfWeek] : "";
}

/**
 * Lesson-tracker grid shape (rows x buttons) for a given weekly lesson count.
 * Total slots must cover lessonsPerWeek * 4 (one package cycle = 4 weeks) —
 * the old hardcoded `{ rows: 2, buttonsPerRow: 6 }` for every lessonsPerWeek
 * >= 3 only ever covered exactly 12 slots, silently truncating (never
 * rendering, never clickable) lesson 13+ for any student scheduled at 4-7
 * lessons/week, a range the admin UI itself allows.
 */
export function getRowConfig(lessonsPerWeek: number): { rows: number; buttonsPerRow: number } {
  if (lessonsPerWeek === 1) return { rows: 1, buttonsPerRow: 4 };
  if (lessonsPerWeek === 2) return { rows: 2, buttonsPerRow: 4 };
  return { rows: 2, buttonsPerRow: Math.ceil((lessonsPerWeek * 4) / 2) };
}
