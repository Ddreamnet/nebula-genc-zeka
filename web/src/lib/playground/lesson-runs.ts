/**
 * "Ders modu" — the classroom tasks from the lesson decks, as data.
 *
 * Source: `Lessons_slide/Nebula ders sunumları/` (Deneme Dersi + Hafta 01).
 * Three of those slides ask for the same shape of thing — one idea, several
 * generations, laid out so a student can compare them — and each was six
 * separate messages before this file existed:
 *
 *  - Deneme dersi, "Her kelime bir düğme": tur 1→4, each turn adding one
 *    clause to the same prompt. → `buildLadder`
 *  - Hafta 1, LAB Adım 3: "aynı tarifi 3 stilde üret". → `buildStyleRun`
 *  - Hafta 1, LAB Adım 4: "aynı avatarı koru, sadece ifadeyi değiştir",
 *    six named expressions. → `buildExpressionRun`
 *
 * The fill-in-the-blank prompt formulas the decks teach live next door in
 * `prompt-cards.ts` — they grew past this file when they stopped being two
 * image cards and became a set covering every modality.
 *
 * Deliberately data and pure functions only: no React, no fetch. The runner
 * lives in the Playground component and just walks the steps this file
 * produces through the ordinary generate endpoint, so a lesson run is N
 * normal turns in the transcript — visible, priced and refundable like any
 * other generation, with no new server surface to secure.
 *
 * Image tools only, on purpose. All three tasks are image tasks in the decks,
 * and text tools carry conversation history that a batch of independent turns
 * would quietly corrupt.
 */

export interface LessonStep {
  /** Shown in the progress pill while this step runs — "Tur 2", "piksel-art". */
  label: string;
  prompt: string;
}

export type LessonRunId = "ladder" | "styles" | "expressions";

/**
 * The prompt ladder from the trial lesson.
 *
 * The deck builds a prompt up one clause at a time and has the class watch
 * what each clause buys: "bir ejderha" → "…origamiden" → "…neon ışıklı bir
 * şehirde" → "…film afişi stilinde". This runs that as four generations from
 * one finished prompt, taking it apart rather than making the student retype
 * four versions — which is also why it pairs with the prompt cards below: fill
 * the card, then ladder the result and see which field did what.
 *
 * Clauses split on commas and semicolons because that is how the decks (and
 * the cards) punctuate a prompt. Returns null when there is nothing to take
 * apart — one clause is not a ladder, and the honest answer there is the
 * lesson's own: add detail first.
 */
export function buildLadder(prompt: string, levels = 4): LessonStep[] | null {
  const parts = prompt
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const n = Math.min(levels, parts.length);
  const steps: LessonStep[] = [];
  for (let i = 1; i <= n; i++) {
    // Cumulative, and rounded so the last step is always the whole prompt
    // however unevenly the clauses divide.
    const take = Math.round((parts.length * i) / n);
    steps.push({ label: `Tur ${i}`, prompt: parts.slice(0, take).join(", ") });
  }
  return steps;
}

/** Hafta 1, LAB Adım 3 — the three styles the slide names, in its order. */
export const LESSON_STYLES = ["karikatür", "piksel-art", "3D render"] as const;

export function buildStyleRun(prompt: string): LessonStep[] | null {
  const base = prompt.trim();
  if (!base) return null;
  return LESSON_STYLES.map((style) => ({
    label: style,
    prompt: `${base} — ${style} tarzında`,
  }));
}

/**
 * Hafta 1, LAB Adım 4 — the sticker pack.
 *
 * The six expressions are the ones printed on the slide. Each prompt spells
 * out "same character, only the face changes" because that is the whole
 * exercise ("paket bir aileye benzesin"), and the reference image is pinned by
 * the caller to the SAME base avatar for every step rather than chained from
 * the previous one — six chained edits drift, and a drifting pack is exactly
 * the failure the slide is warning against.
 */
export const LESSON_EXPRESSIONS: { label: string; clause: string }[] = [
  { label: "gülen", clause: "kocaman gülümsüyor, mutlu" },
  { label: "şaşkın", clause: "şaşkın, gözleri kocaman açılmış, ağzı açık" },
  { label: "uykulu", clause: "uykulu, gözleri yarı kapalı, esniyor" },
  { label: "kızgın", clause: "kızgın, kaşları çatık, somurtuyor" },
  { label: "kalpli", clause: "gözlerinde kalpler var, âşık ve neşeli" },
  { label: "başparmak", clause: "başparmağını yukarı kaldırmış, onaylıyor" },
];

export function buildExpressionRun(): LessonStep[] {
  return LESSON_EXPRESSIONS.map(({ label, clause }) => ({
    label,
    prompt:
      `Referans görseldeki karakterin birebir aynısı: aynı saç, aynı kıyafet, aynı renkler, aynı çizim stili. ` +
      `Tek fark ifadesi olsun — ${clause}. ` +
      `Sticker tarzı, kalın beyaz kenarlık, tamamen düz ve tek renk arka plan.`,
  }));
}
