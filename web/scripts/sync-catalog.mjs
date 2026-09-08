#!/usr/bin/env node
/**
 * Pulls the live OpenRouter catalog and writes
 * `src/lib/playground/capabilities.generated.ts`.
 *
 * Why this exists (docs/playground-studio-plan.md §9): the studio draws its
 * dials from what a model actually accepts. Eight to twelve parameters per
 * model, each with its own range, enum and price SKU, cannot be hand-typed —
 * it goes stale silently and a stale dial is a 400 in front of a ten-year-old.
 *
 * The split is deliberate:
 *  - MACHINE FACTS (ranges, enums, durations, resolutions, price SKUs,
 *    passthrough parameters) are generated here and never hand-edited.
 *  - PRODUCT DECISIONS (Turkish name, description, icon, category, status,
 *    role ceilings, ore rounding) stay hand-written in `tools.ts`.
 *
 * Run:  node scripts/sync-catalog.mjs
 * Needs OPENROUTER_API_KEY (read from .env.local if not already exported).
 *
 * The output is committed. Nothing fetches at runtime.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/lib/playground/capabilities.generated.ts");
const BASE = "https://openrouter.ai/api/v1";

function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const env = readFileSync(join(ROOT, ".env.local"), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("OPENROUTER_API_KEY="));
    if (line) return line.slice("OPENROUTER_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  } catch {
    // Falls through to the error below.
  }
  throw new Error("OPENROUTER_API_KEY not set and not found in .env.local");
}

const KEY = apiKey();

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Every provider model slug `tools.ts` names, live or not. Parsed out of the
 * source rather than duplicated here: one list, and it is the one the app
 * actually ships.
 */
function slugsFromTools() {
  const src = readFileSync(join(ROOT, "src/lib/playground/tools.ts"), "utf8");
  const found = new Set();
  for (const m of src.matchAll(/providerModel:\s*"([^"]+)"/g)) found.add(m[1]);
  return [...found];
}

const num = (v) => (v === null || v === undefined || v === "" ? undefined : Number(v));

/** `{ "0.084": … }` → numbers, dropping anything that isn't one. */
function priceSkus(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = num(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The typed `supported_parameters` map the /images catalog returns. */
function imageParams(sp) {
  const out = {};
  for (const [name, spec] of Object.entries(sp ?? {})) {
    if (!spec || typeof spec !== "object") continue;
    if (spec.type === "enum" && Array.isArray(spec.values)) out[name] = { type: "enum", values: spec.values };
    else if (spec.type === "range") out[name] = { type: "range", min: spec.min ?? 0, max: spec.max ?? 0 };
    else if (spec.type === "boolean") out[name] = { type: "boolean" };
  }
  return out;
}

async function buildImageCaps(wanted) {
  const list = (await get("/images/models")).data ?? [];
  const out = {};
  for (const model of list) {
    if (!wanted.has(model.id)) continue;
    const entry = {
      kind: "image",
      params: imageParams(model.supported_parameters),
      passthrough: [],
      pricing: [],
    };
    // The per-endpoint record is the only place `steps`/`guidance`/`style_id`
    // and the real unit price live; the list entry does not carry them.
    try {
      const detail = await get(`/images/models/${model.id}/endpoints`);
      const endpoint = detail.endpoints?.[0];
      if (endpoint) {
        // A provider endpoint can expose more than the summary does — merge,
        // preferring the endpoint's own spec where they disagree.
        entry.params = { ...entry.params, ...imageParams(endpoint.supported_parameters) };
        entry.passthrough = endpoint.allowed_passthrough_parameters ?? [];
        entry.pricing = (endpoint.pricing ?? []).map((p) => ({
          billable: p.billable,
          unit: p.unit,
          costUsd: num(p.cost_usd) ?? 0,
        }));
      }
    } catch (err) {
      console.warn(`  ! endpoints for ${model.id}: ${err.message}`);
    }
    out[model.id] = entry;
    console.log(`  image  ${model.id}`);
  }
  return out;
}

async function buildVideoCaps(wanted) {
  const list = (await get("/videos/models")).data ?? [];
  const out = {};
  for (const model of list) {
    if (!wanted.has(model.id)) continue;
    out[model.id] = {
      kind: "video",
      durations: model.supported_durations ?? [],
      resolutions: model.supported_resolutions ?? [],
      aspectRatios: model.supported_aspect_ratios ?? [],
      frameImages: model.supported_frame_images ?? [],
      generateAudio: model.generate_audio === true,
      seed: model.seed === true,
      upscaleFactor: model.upscale_factor ?? undefined,
      creativity: model.creativity ?? undefined,
      priceSkus: priceSkus(model.pricing_skus),
      passthrough: model.allowed_passthrough_parameters ?? [],
    };
    console.log(`  video  ${model.id}`);
  }
  return out;
}

async function buildTextCaps(wanted) {
  const list = (await get("/models")).data ?? [];
  const out = {};
  for (const model of list) {
    if (!wanted.has(model.id)) continue;
    // Audio tools ride /chat/completions too; they are catalogued here and
    // told apart by their output modality.
    const outputs = model.architecture?.output_modalities ?? [];
    out[model.id] = {
      kind: outputs.includes("audio") ? "audio" : "text",
      supported: model.supported_parameters ?? [],
      inputModalities: model.architecture?.input_modalities ?? [],
      contextLength: model.context_length ?? undefined,
      maxCompletionTokens: model.top_provider?.max_completion_tokens ?? undefined,
      pricing: {
        prompt: num(model.pricing?.prompt),
        completion: num(model.pricing?.completion),
        webSearch: num(model.pricing?.web_search),
      },
    };
    console.log(`  text   ${model.id}`);
  }
  return out;
}

const slugs = slugsFromTools().filter(Boolean);
const wanted = new Set(slugs);
console.log(`Syncing ${wanted.size} model slugs from ${BASE} …`);

const [image, video, text] = [await buildImageCaps(wanted), await buildVideoCaps(wanted), await buildTextCaps(wanted)];
const caps = { ...text, ...image, ...video };

const missing = slugs.filter((s) => !caps[s]);
if (missing.length > 0) {
  // Never silently downgraded to "soon": a slug leaving the catalog is a
  // product decision, and a human makes it.
  console.warn(`\n⚠ ${missing.length} slug(s) in tools.ts are NOT in the live catalog:`);
  for (const s of missing) console.warn(`   ${s}`);
}

const banner = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Written by \`node scripts/sync-catalog.mjs\` from OpenRouter's live catalog
 * (/models, /images/models, /videos/models and each image model's /endpoints).
 * Last sync: ${new Date().toISOString().slice(0, 10)} — ${Object.keys(caps).length} models.
 *
 * Machine facts only: which parameters a model accepts, their ranges and
 * enums, its price SKUs and its provider passthrough list. Every product
 * decision — Turkish name, icon, category, status, role ceilings — stays in
 * \`tools.ts\`. Re-run the script rather than editing a value here; a hand-edit
 * is a dial that lies to a student the next time the catalog moves.
 */
`;

writeFileSync(
  OUT,
  `${banner}
export interface EnumParam { type: "enum"; values: string[] }
export interface RangeParam { type: "range"; min: number; max: number }
export interface BooleanParam { type: "boolean" }
export type ImageParamSpec = EnumParam | RangeParam | BooleanParam;

export interface ImageCaps {
  kind: "image";
  /** Keyed by the request-body field name: aspect_ratio, quality, n, seed … */
  params: Record<string, ImageParamSpec>;
  /** Provider-specific extras that ride \`provider.options\` (steps, guidance…). */
  passthrough: string[];
  pricing: { billable: string; unit: string; costUsd: number }[];
}

export interface VideoCaps {
  kind: "video";
  durations: number[];
  resolutions: string[];
  aspectRatios: string[];
  frameImages: string[];
  generateAudio: boolean;
  seed: boolean;
  upscaleFactor?: unknown;
  creativity?: unknown;
  /** Raw \`pricing_skus\`, in USD. Key shapes differ per provider — see priceVideo(). */
  priceSkus?: Record<string, number>;
  passthrough: string[];
}

export interface TextCaps {
  kind: "text" | "audio";
  /** OpenRouter's \`supported_parameters\` list for /chat/completions. */
  supported: string[];
  inputModalities: string[];
  contextLength?: number;
  maxCompletionTokens?: number;
  pricing: { prompt?: number; completion?: number; webSearch?: number };
}

export type ModelCaps = ImageCaps | VideoCaps | TextCaps;

export const MODEL_CAPS: Record<string, ModelCaps> = ${JSON.stringify(caps, null, 2)};
`,
);

console.log(`\nWrote ${OUT} (${Object.keys(caps).length} models).`);
