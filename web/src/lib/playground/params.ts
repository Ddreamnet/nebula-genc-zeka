/**
 * The studio: which dials a model actually has, what a role may move them to,
 * and what a given setting costs.
 *
 * ONE schema, three consumers — the panel that draws the dials, the `</>`
 * preview that writes the request out, and the route that validates and
 * charges for it. That is the whole design: a dial cannot appear in the UI
 * without the server knowing about it, and the server cannot accept a value
 * the schema does not describe.
 *
 * Three rules hold everything together (docs/playground-studio-plan.md):
 *
 *  1. **Dials derive from the model, never from a hand-typed list.** Every
 *     range and enum below comes out of `capabilities.generated.ts`, which is
 *     written by `scripts/sync-catalog.mjs` from OpenRouter's live catalog. A
 *     model that has no seed shows no seed dial; Recraft's six variants and
 *     GPT Image's ten are both correct because neither was typed by a person.
 *
 *  2. **Client-side hiding is cosmetic.** `sanitizeParams` is the enforcement
 *     point and runs on the server against the caller's real role, exactly as
 *     `maxImageInputs` already does. A hand-crafted payload gets the same
 *     ceiling a student's panel shows.
 *
 *  3. **Safety locks are not dials.** `personGeneration`, `safety_tolerance`,
 *     `moderation`, `watermark` and `callback_url` have no field here, in any
 *     role. Request bodies are assembled from this whitelist, so there is no
 *     path by which one of them could be set from a browser at all.
 */
import { MODEL_CAPS, type ImageCaps, type ModelCaps, type TextCaps, type VideoCaps } from "@/lib/playground/capabilities.generated";
import { paramDoc, type ParamDoc } from "@/lib/playground/param-docs";
import type { PlaygroundTool } from "@/lib/playground/tools";

export type Role = "admin" | "teacher" | "student";
export type ParamValue = string | number | boolean | null;
export type StudioParams = Record<string, ParamValue>;

/* ------------------------------------------------------------------ */
/* Catalog access                                                      */
/* ------------------------------------------------------------------ */

export function capsFor(tool: PlaygroundTool): ModelCaps | null {
  return MODEL_CAPS[tool.providerModel] ?? null;
}
const asImage = (c: ModelCaps | null): ImageCaps | null => (c?.kind === "image" ? c : null);
const asVideo = (c: ModelCaps | null): VideoCaps | null => (c?.kind === "video" ? c : null);
const asText = (c: ModelCaps | null): TextCaps | null => (c?.kind === "text" || c?.kind === "audio" ? c : null);

function enumValues(caps: ImageCaps | null, key: string): string[] {
  const spec = caps?.params[key];
  return spec && spec.type === "enum" ? spec.values : [];
}
function rangeMax(caps: ImageCaps | null, key: string): number {
  const spec = caps?.params[key];
  return spec && spec.type === "range" ? spec.max : 0;
}
function hasBool(caps: ImageCaps | null, key: string): boolean {
  return caps?.params[key]?.type === "boolean";
}

/* ------------------------------------------------------------------ */
/* Field schema                                                        */
/* ------------------------------------------------------------------ */

export type FieldSpec =
  | { control: "toggle" }
  | { control: "choice"; options: { value: string; label: string; hint?: string }[] }
  | { control: "slider"; min: number; max: number; step: number; unit?: string }
  | { control: "seed" }
  | { control: "text"; placeholder: string; maxLength: number };

export interface StudioField {
  key: string;
  label: string;
  /** "core" is what opens with the panel; "more" hides behind "Daha fazla". */
  tier: "core" | "more";
  spec: FieldSpec;
  /**
   * The value the field starts on. `null` on a slider, a seed or a text box
   * means "the model's own default" — the parameter is then left out of the
   * request entirely rather than sent at a number we invented. An untouched
   * dial must never put a value on the wire that nobody asked for.
   */
  default: ParamValue;
  doc: ParamDoc;
}

const doc = (key: string): ParamDoc => paramDoc(key);

/* ------------------------------------------------------------------ */
/* Role ceilings                                                       */
/* ------------------------------------------------------------------ */

/** Ordered cheapest → dearest; a role's ceiling cuts the tail off the list. */
const IMAGE_RES_ORDER = ["512", "1K", "2K", "4K"];
const VIDEO_RES_ORDER = ["480p", "720p", "1080p", "2K", "4K"];

const ROLE_LIMITS: Record<Role, { imageRes: string; videoRes: string; videoSeconds: number }> = {
  // A student's ceilings are the plan's (§3.2): meaningful choice, bounded
  // bill. A 4K twelve-second clip is not a lesson, it is an accident.
  student: { imageRes: "1K", videoRes: "720p", videoSeconds: 8 },
  teacher: { imageRes: "2K", videoRes: "1080p", videoSeconds: 60 },
  admin: { imageRes: "4K", videoRes: "4K", videoSeconds: 60 },
};

function cutByCeiling(values: string[], order: string[], ceiling: string): string[] {
  const limit = order.indexOf(ceiling);
  if (limit < 0) return values;
  return values.filter((v) => {
    const i = order.indexOf(v);
    return i < 0 ? false : i <= limit;
  });
}

/** Only staff see a dial marked teacher+ / admin. */
function allowed(role: Role, min: Role): boolean {
  if (min === "student") return true;
  if (min === "teacher") return role !== "student";
  return role === "admin";
}

/* ------------------------------------------------------------------ */
/* Personas                                                            */
/* ------------------------------------------------------------------ */

/**
 * Characters a student can hand the model, as a line appended to Nebula's own
 * system prompt — never as a replacement for it. Swapping the system message
 * out is how a "roleplay" dial turns into a way around the safety prompt; the
 * append keeps the guard rails and still teaches what a system message is.
 */
export const PERSONAS: { value: string; label: string; hint: string; prompt: string }[] = [
  { value: "default", label: "Nebula", hint: "Varsayılan yardımcı", prompt: "" },
  {
    value: "ogretmen",
    label: "Öğretmen",
    hint: "Adım adım anlatır, örnek verir",
    prompt: "Bir konuyu anlatırken önce tek cümlelik bir özet ver, sonra adım adım açıkla ve sonunda günlük hayattan bir örnek ekle.",
  },
  {
    value: "hikayeci",
    label: "Hikâyeci",
    hint: "Her cevabı bir hikâyeye çevirir",
    prompt: "Cevaplarını kısa bir hikâye biçiminde kur: bir karakter, bir sorun ve bir çözüm olsun.",
  },
  {
    value: "kisa",
    label: "Kısa & net",
    hint: "En fazla üç cümle",
    prompt: "En fazla üç cümleyle cevap ver. Süsleme yapma, doğrudan sonuca git.",
  },
  {
    value: "sokratik",
    label: "Soru soran",
    hint: "Cevabı vermez, buldurur",
    prompt: "Doğrudan cevabı verme. Öğrencinin kendi bulmasını sağlayacak yönlendirici sorular sor, ancak ısrar ederse cevabı açıkla.",
  },
];

export function personaPrompt(value: unknown): string {
  return PERSONAS.find((p) => p.value === value)?.prompt ?? "";
}

/* ------------------------------------------------------------------ */
/* The fields                                                          */
/* ------------------------------------------------------------------ */

/**
 * Every dial this tool has, for this role, in panel order.
 *
 * Empty for a tool with no catalog entry (a "soon" model, or one whose slug
 * left the catalog) — the panel then draws nothing rather than a row of dials
 * that would 400.
 */
export function studioFields(tool: PlaygroundTool, role: Role): StudioField[] {
  const caps = capsFor(tool);
  if (!caps) return [];
  const fields: StudioField[] = [];
  const add = (min: Role, field: StudioField) => {
    if (allowed(role, min)) fields.push(field);
  };
  const staff = role !== "student";

  if (caps.kind === "text") {
    const text = asText(caps)!;
    const has = (p: string) => text.supported.includes(p);

    add("student", {
      key: "persona",
      label: "Karakter",
      tier: "core",
      spec: { control: "choice", options: PERSONAS.map((p) => ({ value: p.value, label: p.label, hint: p.hint })) },
      default: "default",
      doc: doc("persona"),
    });

    if (has("temperature")) {
      add("student", {
        key: "temperature",
        label: "Yaratıcılık",
        tier: "core",
        // A student gets three named settings, staff get the raw dial. Same
        // parameter, same server path — only the way it is asked differs.
        spec: staff
          ? { control: "slider", min: 0, max: 2, step: 0.05 }
          : {
              control: "choice",
              options: [
                { value: "0.3", label: "Kurallı", hint: "Sözünden çıkmaz" },
                { value: "1", label: "Dengeli", hint: "Varsayılan" },
                { value: "1.6", label: "Çılgın", hint: "Risk alır, şaşırtır" },
              ],
            },
        default: staff ? null : "1",
        doc: doc("temperature"),
      });
    }

    if (has("max_tokens") || has("max_completion_tokens")) {
      const ceiling = Math.min(text.maxCompletionTokens ?? 4000, 8000);
      add("student", {
        key: "maxTokens",
        label: "Cevap uzunluğu",
        tier: "core",
        spec: staff
          ? { control: "slider", min: 128, max: ceiling, step: 128, unit: "token" }
          : {
              control: "choice",
              options: [
                { value: "400", label: "Kısa", hint: "Birkaç cümle" },
                { value: "1200", label: "Orta", hint: "Bir paragraf" },
                { value: String(Math.min(3000, ceiling)), label: "Uzun", hint: "Uzun bir metin" },
              ],
            },
        default: null,
        doc: doc("maxTokens"),
      });
    }

    if (has("reasoning")) {
      add("student", { key: "reasoning", label: "Düşünmesini göster", tier: "core", spec: { control: "toggle" }, default: tool.reasoning === true, doc: doc("reasoning") });
      if (has("reasoning_effort")) {
        add("student", {
          key: "reasoningEffort",
          label: "Ne kadar düşünsün",
          tier: "more",
          spec: {
            control: "choice",
            options: [
              { value: "low", label: "Az" },
              { value: "medium", label: "Orta" },
              { value: "high", label: "Çok" },
            ],
          },
          default: null,
          doc: doc("reasoningEffort"),
        });
      }
    }

    // Perplexity already searches by nature; offering it the switch would
    // suggest it could be turned off, which it cannot.
    if (!tool.providerModel.startsWith("perplexity/")) {
      add("student", { key: "webSearch", label: "İnternete bak", tier: "core", spec: { control: "toggle" }, default: false, doc: doc("webSearch") });
    }

    if (has("seed")) add("student", { key: "seed", label: "Tohum", tier: "more", spec: { control: "seed" }, default: null, doc: doc("seed") });
    if (has("top_p")) add("teacher", { key: "topP", label: "top_p", tier: "more", spec: { control: "slider", min: 0.05, max: 1, step: 0.05 }, default: null, doc: doc("topP") });
    if (has("verbosity")) {
      add("teacher", {
        key: "verbosity",
        label: "Ayrıntı düzeyi",
        tier: "more",
        spec: { control: "choice", options: [{ value: "low", label: "Az" }, { value: "medium", label: "Orta" }, { value: "high", label: "Çok" }] },
        default: null,
        doc: doc("verbosity"),
      });
    }
    if (has("frequency_penalty")) add("teacher", { key: "frequencyPenalty", label: "Tekrar cezası", tier: "more", spec: { control: "slider", min: -2, max: 2, step: 0.1 }, default: null, doc: doc("frequencyPenalty") });
    if (has("presence_penalty")) add("teacher", { key: "presencePenalty", label: "Konu cezası", tier: "more", spec: { control: "slider", min: -2, max: 2, step: 0.1 }, default: null, doc: doc("presencePenalty") });
    if (has("repetition_penalty")) add("teacher", { key: "repetitionPenalty", label: "Yineleme cezası", tier: "more", spec: { control: "slider", min: 0.5, max: 2, step: 0.05 }, default: null, doc: doc("repetitionPenalty") });
    if (has("stop")) add("teacher", { key: "stop", label: "Durdurma sözcüğü", tier: "more", spec: { control: "text", placeholder: "virgülle ayır", maxLength: 120 }, default: null, doc: doc("stop") });
    if (has("response_format")) add("teacher", { key: "jsonMode", label: "JSON cevap", tier: "more", spec: { control: "toggle" }, default: false, doc: doc("jsonMode") });
    add("teacher", { key: "systemExtra", label: "Ek sistem talimatı", tier: "more", spec: { control: "text", placeholder: "Modele en baştan söylenecek", maxLength: 400 }, default: null, doc: doc("systemExtra") });
    if (has("top_k")) add("admin", { key: "topK", label: "top_k", tier: "more", spec: { control: "slider", min: 0, max: 100, step: 1 }, default: null, doc: doc("topK") });
    if (has("min_p")) add("admin", { key: "minP", label: "min_p", tier: "more", spec: { control: "slider", min: 0, max: 1, step: 0.01 }, default: null, doc: doc("minP") });

    return fields;
  }

  if (caps.kind === "audio") {
    const text = asText(caps)!;
    // Only the OpenAI voice models take an `audio` block; Lyria (music) has
    // no voice at all, so no dial is drawn for it.
    if (tool.providerModel.startsWith("openai/")) {
      add("student", {
        key: "voice",
        label: "Ses",
        tier: "core",
        spec: {
          control: "choice",
          options: OPENAI_VOICES.map((v) => ({ value: v.value, label: v.label, hint: v.hint })),
        },
        default: "alloy",
        doc: doc("voice"),
      });
    }
    if (text.supported.includes("temperature")) {
      add("teacher", { key: "temperature", label: "Yaratıcılık", tier: "more", spec: { control: "slider", min: 0, max: 2, step: 0.05 }, default: null, doc: doc("temperature") });
    }
    if (text.supported.includes("seed")) add("student", { key: "seed", label: "Tohum", tier: "more", spec: { control: "seed" }, default: null, doc: doc("seed") });
    return fields;
  }

  if (caps.kind === "image") {
    const image = asImage(caps)!;
    // No `n` dial yet, deliberately: a turn holds exactly one assistant
    // message with one `output_path`, so four variants would either lose
    // three of themselves on reload or force the transcript schema open —
    // and that schema is frozen (plan §0). It is the one image dial waiting
    // on a place to put more than one picture per turn.
    const resolutions = cutByCeiling(enumValues(image, "resolution"), IMAGE_RES_ORDER, ROLE_LIMITS[role].imageRes);
    if (resolutions.length > 1) {
      add("student", {
        key: "resolution",
        label: "Çözünürlük",
        tier: "core",
        spec: { control: "choice", options: resolutions.map((v) => ({ value: v, label: v })) },
        default: resolutions.includes("1K") ? "1K" : resolutions[0],
        doc: doc("resolution"),
      });
    }

    if (enumValues(image, "background").includes("transparent")) {
      add("student", { key: "transparent", label: "Şeffaf arka plan", tier: "core", spec: { control: "toggle" }, default: false, doc: doc("transparent") });
    }

    if (hasBool(image, "seed")) add("student", { key: "seed", label: "Tohum", tier: "core", spec: { control: "seed" }, default: null, doc: doc("seed") });

    const quality = enumValues(image, "quality");
    if (quality.length > 1) {
      add("teacher", {
        key: "quality",
        label: "Kalite",
        tier: "more",
        spec: { control: "choice", options: quality.map((v) => ({ value: v, label: v === "auto" ? "Otomatik" : v === "low" ? "Düşük" : v === "medium" ? "Orta" : "Yüksek" })) },
        default: "auto",
        doc: doc("quality"),
      });
    }

    const formats = enumValues(image, "output_format");
    if (formats.length > 1) {
      add("teacher", {
        key: "outputFormat",
        label: "Dosya biçimi",
        tier: "more",
        spec: { control: "choice", options: formats.map((v) => ({ value: v, label: v.toUpperCase() })) },
        default: null,
        doc: doc("outputFormat"),
      });
    }

    if (rangeMax(image, "output_compression") > 0) {
      add("admin", { key: "outputCompression", label: "Sıkıştırma", tier: "more", spec: { control: "slider", min: 0, max: 100, step: 5, unit: "%" }, default: null, doc: doc("outputCompression") });
    }
    return fields;
  }

  // ---- Video ----------------------------------------------------------
  const video = asVideo(caps)!;
  const durations = video.durations.filter((d) => d <= ROLE_LIMITS[role].videoSeconds);
  if (durations.length > 1) {
    add("student", {
      key: "duration",
      label: "Süre",
      tier: "core",
      spec: { control: "choice", options: durations.map((d) => ({ value: String(d), label: `${d} sn` })) },
      default: String(defaultDuration(tool, durations)),
      doc: doc("duration"),
    });
  }

  const resolutions = cutByCeiling(video.resolutions, VIDEO_RES_ORDER, ROLE_LIMITS[role].videoRes);
  if (resolutions.length > 1) {
    add("student", {
      key: "videoResolution",
      label: "Çözünürlük",
      tier: "core",
      spec: { control: "choice", options: resolutions.map((v) => ({ value: v, label: v })) },
      default: resolutions.includes("720p") ? "720p" : resolutions[0],
      doc: doc("videoResolution"),
    });
  }

  if (video.generateAudio) {
    add("student", { key: "generateAudio", label: "Sesli üret", tier: "core", spec: { control: "toggle" }, default: true, doc: doc("generateAudio") });
  }
  if (video.frameImages.includes("last_frame")) {
    add("student", { key: "lastFrame", label: "Bitiş karesi", tier: "core", spec: { control: "toggle" }, default: false, doc: doc("lastFrame") });
  }
  if (video.seed) add("student", { key: "seed", label: "Tohum", tier: "more", spec: { control: "seed" }, default: null, doc: doc("seed") });
  return fields;
}

/**
 * OpenAI's voice roster for the chat/completions audio path.
 *
 * Pulled from the endpoint itself, not from docs: sending a nonsense voice
 * makes the provider answer 400 with the complete supported list, which is
 * the only authoritative source — the /models catalog does not carry voices.
 * All thirteen were then each run through a real 16-token generation on
 * `openai/gpt-audio-mini` and returned audio (8 Sep 2026). The single fixed
 * `voice: "alloy"` this replaces was the last hardcoded parameter in the
 * audio path.
 */
export const OPENAI_VOICES = [
  { value: "alloy", label: "Alloy", hint: "Nötr, dengeli" },
  { value: "echo", label: "Echo", hint: "Sakin, derin" },
  { value: "fable", label: "Fable", hint: "Masalcı" },
  { value: "onyx", label: "Onyx", hint: "Kalın, ağır" },
  { value: "nova", label: "Nova", hint: "Genç, hızlı" },
  { value: "shimmer", label: "Shimmer", hint: "Parlak, canlı" },
  { value: "coral", label: "Coral", hint: "Neşeli" },
  { value: "verse", label: "Verse", hint: "Hikâye anlatan" },
  { value: "ballad", label: "Ballad", hint: "Anlatıcı tonu" },
  { value: "ash", label: "Ash", hint: "Yumuşak, sıcak" },
  { value: "sage", label: "Sage", hint: "Bilge, ağır" },
  { value: "marin", label: "Marin", hint: "Sakin, berrak" },
  { value: "cedar", label: "Cedar", hint: "Dingin, derin" },
] as const;

/** The tool's catalogued duration if the model still offers it, else the shortest. */
function defaultDuration(tool: PlaygroundTool, durations: number[]): number {
  const preferred = tool.videoDuration ?? 4;
  return durations.includes(preferred) ? preferred : durations[0];
}

/* ------------------------------------------------------------------ */
/* Defaults, sanitising, diffing                                       */
/* ------------------------------------------------------------------ */

export function defaultParams(tool: PlaygroundTool, role: Role): StudioParams {
  const out: StudioParams = {};
  for (const f of studioFields(tool, role)) out[f.key] = f.default;
  return out;
}

function clampNumber(value: unknown, min: number, max: number, step: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(max, Math.max(min, n));
  // Snap to the dial's own grain so a crafted 0.0001 can't become a distinct
  // value the UI could never show.
  const snapped = Math.round(clamped / step) * step;
  return Math.round(snapped * 1e6) / 1e6;
}

/**
 * The authoritative filter. Anything not described by this tool's schema for
 * this role is dropped; anything out of range is clamped rather than
 * rejected, because a stale tab should cost a student a slider position, not
 * a typed prompt.
 *
 * The server calls this with the caller's real role before building a request
 * body or charging for one. The client calls it too, so the price it shows is
 * the price that will be taken.
 */
export function sanitizeParams(tool: PlaygroundTool, role: Role, raw: unknown): StudioParams {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: StudioParams = {};
  for (const field of studioFields(tool, role)) {
    const value = source[field.key];
    if (value === undefined || value === null) {
      out[field.key] = field.default;
      continue;
    }
    switch (field.spec.control) {
      case "toggle":
        out[field.key] = value === true || value === "true";
        break;
      case "choice": {
        const asString = String(value);
        out[field.key] = field.spec.options.some((o) => o.value === asString) ? asString : field.default;
        break;
      }
      case "slider":
        out[field.key] = clampNumber(value, field.spec.min, field.spec.max, field.spec.step) ?? field.default;
        break;
      case "seed": {
        const n = Math.trunc(Number(value));
        out[field.key] = Number.isFinite(n) && n >= 0 && n <= 2_147_483_647 ? n : field.default;
        break;
      }
      case "text": {
        const trimmed = String(value).trim().slice(0, field.spec.maxLength);
        out[field.key] = trimmed.length > 0 ? trimmed : field.default;
        break;
      }
    }
  }
  return out;
}

/** How many dials are off their default — the badge on the studio button. */
export function changedCount(tool: PlaygroundTool, role: Role, params: StudioParams): number {
  return studioFields(tool, role).filter((f) => {
    const v = params[f.key];
    return v !== undefined && v !== f.default;
  }).length;
}

/** Params worth writing to `ai_generations.params`: the ones actually moved. */
export function nonDefaultParams(tool: PlaygroundTool, role: Role, params: StudioParams): StudioParams {
  const out: StudioParams = {};
  for (const f of studioFields(tool, role)) {
    const v = params[f.key];
    if (v !== undefined && v !== null && v !== f.default) out[f.key] = v;
  }
  return out;
}

/**
 * How many pictures may ride along with one message.
 *
 * The tool's own ceiling, except on a video model where the student switched
 * the end-frame dial on: a clip then takes two, the first frame and the last.
 * The server calls this with its own sanitised params, so turning the dial on
 * in a crafted payload without the model supporting `last_frame` buys nothing.
 */
export function imageBudget(tool: PlaygroundTool, params: StudioParams): number {
  const base = tool.maxImageInputs ?? 0;
  if (tool.modality !== "video" || params.lastFrame !== true) return base;
  const caps = capsFor(tool);
  return caps?.kind === "video" && caps.frameImages.includes("last_frame") ? Math.max(base, 2) : base;
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/** $0.04 buys one cevher — the ratio the whole catalog is calibrated against. */
export const ORE_PER_USD = 25;

/**
 * No single generation may be STARTED above this, whatever the dials say.
 * The role ceilings above are the first line; this is the one that holds even
 * for an admin, and the one the panel points at when the send button locks.
 *
 * It is a refusal, not a discount. Capping the *price* at 60 was the first
 * shape of this and it was wrong: a student maxing Veo 3.1 to eight seconds
 * would have been charged 60 cevher for a clip that really costs 80, and the
 * gap came out of the treasury silently. `generationCost` now always tells
 * the truth and `exceedsCap` is what stops the send — on the client so the
 * button can explain itself, and again on the server so a crafted payload
 * gets the same answer.
 */
export const MAX_ORE_PER_GENERATION = 60;

/** Rough price of one image relative to the tool's catalogued base. */
const IMAGE_RES_MULTIPLIER: Record<string, number> = { "512": 0.5, "1K": 1, "2K": 2, "4K": 4 };
const IMAGE_QUALITY_MULTIPLIER: Record<string, number> = { low: 0.6, auto: 1, medium: 1, high: 1.6 };

/**
 * Picks the `pricing_skus` entry that matches a resolution and an audio
 * choice, out of the ragged key shapes providers publish:
 *   duration_seconds · duration_seconds_with_audio · duration_seconds_720p ·
 *   duration_seconds_without_audio_4k · cents_per_video_output_second_720p …
 *
 * Scored rather than matched exactly, because no two providers name these the
 * same way and an exact table would be wrong the first time one is renamed.
 * Returns dollars per second, or null when the model is billed by tokens
 * (Seedance), which cannot be priced before the clip exists.
 */
export function videoUsdPerSecond(caps: VideoCaps, resolution: string, withAudio: boolean): number | null {
  const skus = caps.priceSkus;
  if (!skus) return null;
  const res = resolution.toLowerCase();
  let best: { score: number; usd: number } | null = null;

  for (const [key, value] of Object.entries(skus)) {
    const k = key.toLowerCase();
    const perSecond = k.includes("second");
    if (!perSecond) continue;
    const cents = k.startsWith("cents_per");
    const usd = cents ? value / 100 : value;

    // A key that names a different resolution or the wrong audio state is not
    // a worse match — it is the wrong price, and must never be picked.
    const namesRes = VIDEO_RES_ORDER.map((r) => r.toLowerCase()).concat("1024p").filter((r) => k.includes(r));
    if (namesRes.length > 0 && !namesRes.includes(res)) continue;
    const saysAudio = k.includes("with_audio");
    const saysSilent = k.includes("without_audio");
    if (saysAudio && !withAudio) continue;
    if (saysSilent && withAudio) continue;
    // An image_to_video key prices a different call than the one we may make.
    if (k.includes("image_to_video")) continue;

    const score = (namesRes.length > 0 ? 2 : 0) + (saysAudio || saysSilent ? 1 : 0);
    if (!best || score > best.score) best = { score, usd };
  }
  return best?.usd ?? null;
}

export interface CostInput {
  /** Attached + carried + remembered pictures that reach the model. */
  imageCount: number;
  params: StudioParams;
}

/**
 * What one generation costs, in cevher — the single number the composer
 * shows, the `</>` panel prints and `rpc_start_generation` takes.
 *
 * Video is priced from the provider's own published per-second SKU, so the
 * figure is a real quote. Image and text are priced as a *product price*
 * scaled off the tool's catalogued base: their real cost is billed per token
 * and cannot be known before the model answers. Both round up and never
 * exceed MAX_ORE_PER_GENERATION.
 */
export function generationCost(tool: PlaygroundTool, input: CostInput): number {
  const caps = capsFor(tool);
  const { params, imageCount } = input;
  let ore = tool.oreCost;

  if (caps?.kind === "video") {
    const resolution = String(params.videoResolution ?? tool.videoResolution ?? "720p");
    const withAudio = params.generateAudio !== false && caps.generateAudio;
    const seconds = Number(params.duration ?? tool.videoDuration ?? 4);
    const usdPerSecond = videoUsdPerSecond(caps, resolution, withAudio);
    if (usdPerSecond !== null) {
      ore = usdPerSecond * seconds * ORE_PER_USD;
    } else {
      // Token-billed (Seedance) or an unpublished SKU: scale the catalogued
      // base by how much longer/larger this clip is than the one it was
      // priced for, rather than quoting a number we cannot stand behind.
      const baseSeconds = tool.videoDuration ?? 4;
      const baseRes = VIDEO_RES_ORDER.indexOf(String(tool.videoResolution ?? "720p"));
      const wantRes = VIDEO_RES_ORDER.indexOf(resolution);
      const resFactor = baseRes >= 0 && wantRes >= 0 ? Math.pow(2, wantRes - baseRes) : 1;
      ore = tool.oreCost * (seconds / Math.max(1, baseSeconds)) * resFactor * (withAudio ? 1 : 0.7);
    }
  } else if (caps?.kind === "image") {
    const resolution = String(params.resolution ?? "1K");
    const quality = String(params.quality ?? "auto");
    ore = tool.oreCost * (IMAGE_RES_MULTIPLIER[resolution] ?? 1) * (IMAGE_QUALITY_MULTIPLIER[quality] ?? 1);
  } else if (caps?.kind === "text") {
    // Text is a flat per-message price; only the two dials that add a real
    // upstream line item move it.
    if (params.webSearch === true) ore += WEB_SEARCH_ORE;
    const maxTokens = Number(params.maxTokens ?? 0);
    if (Number.isFinite(maxTokens) && maxTokens > 2000) ore += 0.05;
  }

  ore += imageCount * IMAGE_INPUT_ORE[tool.modality === "image" ? "image" : tool.modality === "video" ? "video" : "text"];
  return Math.round(ore * 100) / 100;
}

/**
 * OpenRouter's web plugin bills per result, $0.004 each at the default five —
 * $0.02, half a cevher, rounded up to cover the plugin's own floor.
 */
const WEB_SEARCH_ORE = 0.5;

/** Mirrors tools.ts — see the note there for how each figure was measured. */
const IMAGE_INPUT_ORE = { text: 0.1, image: 0.25, video: 0 } as const;

/**
 * Whether this combination of dials is too expensive to run at all.
 *
 * The composer disables Gönder on it and the studio panel says why, so a
 * student meets the limit as an explanation rather than as a failure. The
 * generate route asks the same question before it charges anything.
 */
export function exceedsCap(tool: PlaygroundTool, input: CostInput): boolean {
  return generationCost(tool, input) > MAX_ORE_PER_GENERATION;
}
