/**
 * "N. hafta" — how many weeks a student has been enrolled, counted from the
 * `students` row's created_at. Kept in one place so the panel's chip and the
 * Playground's bar can never disagree, and kept out of component bodies so
 * the clock read is not an impure call during render.
 */
export function weekNumberSince(createdAt: string | null | undefined, now: number = Date.now()): number | null {
  if (!createdAt) return null;
  const weeks = Math.floor((now - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Number.isFinite(weeks) && weeks > 0 ? weeks : null;
}
