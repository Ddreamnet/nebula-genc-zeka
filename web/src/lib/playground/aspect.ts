/**
 * Output shape for image generation, shared by the composer and the route.
 *
 * Its own module rather than living in `lib/ai/openrouter.ts` (where the
 * ratio used to be a private constant) because the composer needs the list
 * too, and that module reads the OpenRouter key and does server-side fetches
 * — pulling it into a client bundle to get four strings would be a bad trade.
 *
 * Week 7 of the curriculum is what made this a choice instead of a constant:
 * "kullanılabilir bir afiş/logo/kapak tasarla" is three different shapes, and
 * everything came out 9:16. Vertical stays the default — stickers and avatars,
 * the two things students generate most, belong there.
 */
export const ASPECT_RATIOS = [
  { value: "9:16", label: "Dikey", hint: "Sticker, avatar, telefon duvar kâğıdı" },
  { value: "1:1", label: "Kare", hint: "Profil fotoğrafı, albüm kapağı" },
  { value: "16:9", label: "Geniş", hint: "Afiş, banner, video karesi" },
  { value: "4:3", label: "Klasik", hint: "Sunum görseli, kitap içi çizim" },
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number]["value"];

export const DEFAULT_ASPECT_RATIO: AspectRatio = "9:16";

export function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ASPECT_RATIOS.some((r) => r.value === value);
}
