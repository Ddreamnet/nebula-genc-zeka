import type { ToolModality } from "@/lib/playground/tools";

/**
 * The tag chips under the composer's prompt.
 *
 * Each one is a clause a student can drop into a prompt with one tap —
 * "sinematik", "8k", "piksel-art" — and see the sentence change. Not a menu of
 * adjectives: every word here is a term the decks actually teach, so a kid
 * who taps three of them has written a prompt a professional would recognise
 * and has met three words they can now use on purpose. The full fill-in-the-
 * blank formulas live in prompt-cards.ts; these are the loose change.
 *
 * Kept short on purpose. Six chips is a vocabulary; twenty is a wall.
 */
const TAGS: Record<ToolModality | "web", readonly string[]> = {
  image: ["sinematik", "detaylı", "gerçekçi", "8k", "karikatür", "piksel-art", "sulu boya"],
  video: ["sinematik", "yavaş çekim", "drone çekimi", "canlı renkler", "sabit kamera"],
  audio: ["neşeli", "sakin", "epik", "lo-fi", "hızlı tempo"],
  text: ["adım adım", "kısa ve öz", "örnekli", "çocuk dilinde", "tablo hâlinde"],
  web: ["mobil uyumlu", "koyu tema", "animasyonlu", "tek sayfa", "büyük butonlar"],
};

export function tagsFor(modality: ToolModality, categoryId?: string): readonly string[] {
  return categoryId === "web" ? TAGS.web : TAGS[modality];
}

/** Splits a prompt into the comma-separated clauses the decks punctuate with. */
function clausesOf(prompt: string): string[] {
  return prompt
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasTag(prompt: string, tag: string): boolean {
  const needle = tag.toLocaleLowerCase("tr-TR");
  return clausesOf(prompt).some((c) => c.toLocaleLowerCase("tr-TR") === needle);
}

/**
 * Adds the tag as a new clause, or removes it if it is already one. Removing
 * is by whole clause, so "detaylı" never eats the "detaylı çizgiler" a student
 * typed themselves.
 */
export function toggleTag(prompt: string, tag: string): string {
  const clauses = clausesOf(prompt);
  const needle = tag.toLocaleLowerCase("tr-TR");
  const without = clauses.filter((c) => c.toLocaleLowerCase("tr-TR") !== needle);
  if (without.length !== clauses.length) return without.join(", ");
  return [...clauses, tag].join(", ");
}
