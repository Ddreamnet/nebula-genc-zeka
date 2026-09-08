/**
 * Output shape for image and video generation, shared by the composer, the
 * tools panel and the generate route.
 *
 * Its own module rather than living in `lib/ai/openrouter.ts` (where the
 * ratio used to be a private constant) because the composer needs the list
 * too, and that module reads the OpenRouter key and does server-side fetches
 * — pulling it into a client bundle to get a few strings would be a bad trade.
 *
 * The list below is the MASTER list: every ratio the product is willing to
 * name. Which of them a given model actually accepts lives on the tool
 * (`aspectRatios` in tools.ts), copied from OpenRouter's live catalog — a
 * model handed a ratio it does not support answers with a 400, and a 400 is
 * not something a ten-year-old should ever be shown. `aspectRatiosFor` is the
 * only way the UI should ever build a chip row, and `resolveAspectRatio` is
 * the only way the server should ever accept one.
 */
export const ASPECT_RATIOS = [
  { value: "1:1", label: "Kare", hint: "Sticker, profil fotoğrafı, albüm kapağı" },
  { value: "16:9", label: "Geniş", hint: "Afiş, banner, film karesi" },
  { value: "9:16", label: "Dikey", hint: "Story, telefon duvar kâğıdı" },
  { value: "4:3", label: "Klasik", hint: "Sunum görseli, kitap içi çizim" },
  { value: "3:2", label: "Fotoğraf", hint: "Fotoğraf makinesi oranı, manzara" },
  { value: "3:4", label: "Portre", hint: "Portre, kitap kapağı" },
  { value: "2:3", label: "Poster", hint: "Dikey poster, kartpostal" },
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number]["value"];

/** Anything that carries a supported-ratio list — a tool, or a stub of one. */
export interface AspectAware {
  modality: string;
  aspectRatios?: readonly AspectRatio[];
}

/**
 * The preferred default per modality. Vertical for pictures — stickers and
 * avatars, the two things students generate most, belong there. Landscape for
 * clips, which is what every video model defaulted to before the ratio was
 * sent at all, so nothing already made changes shape.
 */
export const DEFAULT_ASPECT_RATIO: AspectRatio = "9:16";
const DEFAULT_VIDEO_ASPECT_RATIO: AspectRatio = "16:9";

export function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ASPECT_RATIOS.some((r) => r.value === value);
}

/** The chips a tool gets, in the master order. Empty for text and audio. */
export function aspectRatiosFor(tool: AspectAware): (typeof ASPECT_RATIOS)[number][] {
  const supported = tool.aspectRatios;
  if (!supported || supported.length === 0) return [];
  return ASPECT_RATIOS.filter((r) => supported.includes(r.value));
}

/** The ratio a tool starts on: the modality's preference, or its first supported one. */
export function defaultAspectFor(tool: AspectAware): AspectRatio | null {
  const options = aspectRatiosFor(tool);
  if (options.length === 0) return null;
  const preferred = tool.modality === "video" ? DEFAULT_VIDEO_ASPECT_RATIO : DEFAULT_ASPECT_RATIO;
  return options.some((r) => r.value === preferred) ? preferred : options[0].value;
}

/**
 * What the server actually sends. A value the tool does not support — a stale
 * tab, a hand-crafted payload, a model whose catalog entry changed — falls
 * back to the tool's default rather than 400-ing: the value is cosmetic, and a
 * student should not lose a typed prompt over it. Null means "don't send one"
 * (text, audio, a tool with no catalog list).
 */
export function resolveAspectRatio(tool: AspectAware, requested: unknown): AspectRatio | null {
  if (isAspectRatio(requested) && tool.aspectRatios?.includes(requested)) return requested;
  return defaultAspectFor(tool);
}
