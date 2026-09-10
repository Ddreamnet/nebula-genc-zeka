/**
 * The request body itself — one builder, used by the server that sends it and
 * by the `</>` panel that shows it.
 *
 * This is what makes the preview honest. Before, `payload-preview.ts` wrote
 * out its own idea of the body and `lib/ai/openrouter.ts` wrote the real one;
 * the two agreed only as long as someone remembered to change both. Now the
 * panel prints the same object the fetch sends, and a dial that reaches one
 * necessarily reaches the other.
 *
 * Nothing here reads a secret or touches the network, so it is safe in the
 * client bundle. The Authorization header lives with the fetch, not with the
 * body — which is also why the panel can never leak the key.
 */
import type { PlaygroundTool } from "@/lib/playground/tools";
import type { AspectRatio } from "@/lib/playground/aspect";
import { SYSTEM_PROMPT, WEB_SYSTEM_PROMPT } from "@/lib/playground/system-prompts";
import { capsFor, personaPrompt, type StudioParams } from "@/lib/playground/params";
import { audioFormat, formatSize, type Attachment } from "@/lib/playground/attachments";

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/**
 * OpenAI-style content parts, one shape per attachment kind. All four media
 * forms are from OpenRouter's multimodal docs (images, PDFs, audio, video —
 * read 10 Sep 2026):
 *  - `image_url`   a picture, data URL or https;
 *  - `file`        a PDF; `file_data` is a data URL, `filename` is shown to
 *                  the model. Needs the `file-parser` plugin on models that
 *                  cannot read PDFs natively — see buildTextBody;
 *  - `input_audio` raw base64 (no data: prefix) plus the format name. Audio
 *                  must be inline: URLs are not accepted;
 *  - `video_url`   a data URL for a local clip.
 */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } }
  | { type: "video_url"; video_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

/** A data URL shortened for the `</>` panel — the prefix plus how big the thing it replaced is. */
export function dataStub(a: Pick<Attachment, "kind" | "size" | "data">): string {
  return a.data.startsWith("data:") ? `${a.data.slice(0, 24)}… (${formatSize(a)})` : a.data;
}

/**
 * A text file, pasted into the prompt. Every model reads this, which is
 * what makes .txt/.md/.csv (and Word, Excel and PowerPoint, unpacked to text
 * in the browser) work on models with no file input at all.
 */
function fileBlock(a: Attachment, stub: boolean): string {
  const name = a.name || "dosya.txt";
  const body = stub ? `<${formatSize(a)} — dosyanın metni buraya gelir>` : a.data;
  return `<dosya ad="${name}">\n${body}\n</dosya>`;
}

function mediaPart(a: Attachment, stub: boolean): ContentPart {
  const data = stub ? dataStub(a) : a.data;
  switch (a.kind) {
    case "document":
      return { type: "file", file: { filename: a.name || "belge.pdf", file_data: data } };
    case "audio":
      // The bare base64: OpenRouter takes `data` without the data: prefix.
      return { type: "input_audio", input_audio: { data: stub ? data : data.slice(data.indexOf(",") + 1), format: audioFormat(a.mime) ?? "mp3" } };
    case "video":
      return { type: "video_url", video_url: { url: data } };
    default:
      return { type: "image_url", image_url: { url: data } };
  }
}

/**
 * One turn as the model sees it. Text attachments go into the words
 * (before the prompt, so the question comes last — the order long-document
 * prompting guides recommend); everything else becomes a content part after
 * the text. `stub` is for the `</>` preview, which shows shapes and sizes
 * rather than megabytes of base64.
 *
 * Used by the generate route for the real body and by the preview panel for
 * the printed one, so the two cannot drift.
 */
export function chatMessage(role: "user" | "assistant", text: string, attachments: readonly Attachment[] = [], opts: { stub?: boolean } = {}): ChatMessage {
  const stub = opts.stub === true;
  const files = attachments.filter((a) => a.kind === "text");
  const media = attachments.filter((a) => a.kind !== "text");
  const body = files.length > 0 ? `${files.map((a) => fileBlock(a, stub)).join("\n\n")}\n\n${text}` : text;
  if (media.length === 0) return { role, content: body };
  return { role, content: [{ type: "text", text: body }, ...media.map((a) => mediaPart(a, stub))] };
}

function carriesFile(messages: readonly ChatMessage[]): boolean {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === "file"));
}

/** A JSON body, printed rather than typed — every field is a wire value. */
export type RequestBody = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * The slug that actually goes on the wire.
 *
 * `:online` is OpenRouter's web-search variant and works on any model, not
 * just search-native ones — verified live on google/gemini-2.5-flash, which
 * came back with `url_citation` annotations and a $0.008 search line item
 * (8 Sep 2026). That measured price is what `WEB_SEARCH_ORE` is set against.
 */
export function modelSlug(tool: PlaygroundTool, params: StudioParams): string {
  return params.webSearch === true ? `${tool.providerModel}:online` : tool.providerModel;
}

/**
 * The system message: Nebula's own prompt, then the persona line, then the
 * teacher's extra instruction. Appended, never replaced — a persona that
 * could overwrite the system prompt would be a way around it.
 */
export function systemPromptFor(tool: PlaygroundTool, categoryId: string | null | undefined, params: StudioParams): string {
  const base = categoryId === "web" ? WEB_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const extras = [personaPrompt(params.persona), typeof params.systemExtra === "string" ? params.systemExtra : ""].filter((s) => s.trim().length > 0);
  return extras.length > 0 ? `${base}\n\n${extras.join("\n\n")}` : base;
}

/** Adds `key` only when the dial was actually moved off "model's default". */
function put(body: RequestBody, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  body[key] = value;
}

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

/** POST /chat/completions — text, and the audio tools that ride the same endpoint. */
export function buildTextBody(args: { tool: PlaygroundTool; params: StudioParams; messages: ChatMessage[]; stream?: boolean }): RequestBody {
  const { tool, params, messages } = args;
  const caps = capsFor(tool);
  const supported = caps?.kind === "text" || caps?.kind === "audio" ? caps.supported : [];
  const has = (p: string) => supported.includes(p);

  const body: RequestBody = { model: modelSlug(tool, params), messages };
  body.stream = args.stream !== false;
  body.stream_options = { include_usage: true };

  if (has("temperature")) put(body, "temperature", numeric(params.temperature));
  // A few models (GPT-5, Codex) only take the newer name; sending the wrong
  // one is a 400, so the catalog decides which key is written.
  const maxTokens = numeric(params.maxTokens);
  if (maxTokens !== null) put(body, has("max_tokens") ? "max_tokens" : "max_completion_tokens", maxTokens);
  if (has("seed")) put(body, "seed", numeric(params.seed));
  if (has("top_p")) put(body, "top_p", numeric(params.topP));
  if (has("top_k")) put(body, "top_k", numeric(params.topK));
  if (has("min_p")) put(body, "min_p", numeric(params.minP));
  if (has("frequency_penalty")) put(body, "frequency_penalty", numeric(params.frequencyPenalty));
  if (has("presence_penalty")) put(body, "presence_penalty", numeric(params.presencePenalty));
  if (has("repetition_penalty")) put(body, "repetition_penalty", numeric(params.repetitionPenalty));
  if (has("verbosity")) put(body, "verbosity", params.verbosity);
  if (has("stop") && typeof params.stop === "string") {
    const stops = params.stop.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    if (stops.length > 0) body.stop = stops;
  }
  if (has("response_format") && params.jsonMode === true) body.response_format = { type: "json_object" };
  if (has("reasoning") && params.reasoning === true) {
    body.reasoning = has("reasoning_effort") && typeof params.reasoningEffort === "string" ? { enabled: true, effort: params.reasoningEffort } : { enabled: true };
  }
  // A PDF in the conversation switches the file parser on. Models whose
  // catalog entry lists "file" read the PDF themselves (`native`, billed as
  // input tokens); for the rest OpenRouter's `cloudflare-ai` engine turns it
  // into text first, free. Set explicitly because OpenRouter's own fallback
  // for a non-native model is `mistral-ocr` at $2 per thousand pages —
  // a line item nothing here has priced. (`pdf-text`, the old name of the
  // free engine, is deprecated and redirects to `cloudflare-ai`.)
  if (carriesFile(messages)) {
    const native = caps?.kind === "text" && caps.inputModalities.includes("file");
    body.plugins = [{ id: "file-parser", pdf: { engine: native ? "native" : "cloudflare-ai" } }];
  }
  return body;
}

/** POST /chat/completions with an audio modality — see generateAudio(). */
export function buildAudioBody(args: { tool: PlaygroundTool; params: StudioParams; messages: ChatMessage[] }): RequestBody {
  const body = buildTextBody({ ...args, stream: true });
  body.modalities = ["text", "audio"];
  // Only the OpenAI voice models take an `audio` block, and only `pcm16`
  // once streaming; Lyria (music) takes none at all and 400s if given one.
  if (args.tool.providerModel.startsWith("openai/")) {
    body.audio = { voice: typeof args.params.voice === "string" ? args.params.voice : "alloy", format: "pcm16" };
  }
  // Reasoning and web search are not things a voice model does.
  delete body.reasoning;
  return body;
}

/** POST /images */
export function buildImageBody(args: {
  tool: PlaygroundTool;
  params: StudioParams;
  prompt: string;
  aspectRatio: AspectRatio | null;
  /** Data URLs or signed HTTPS URLs; the preview passes stubs instead. */
  references: string[];
}): RequestBody {
  const { tool, params, prompt, aspectRatio, references } = args;
  const body: RequestBody = { model: tool.providerModel, prompt, n: 1 };
  put(body, "aspect_ratio", aspectRatio);
  put(body, "resolution", params.resolution);
  put(body, "quality", params.quality === "auto" ? null : params.quality);
  put(body, "output_format", params.outputFormat);
  put(body, "output_compression", numeric(params.outputCompression));
  put(body, "seed", numeric(params.seed));
  // Only sent when on: `background: "auto"` is the model's own default and
  // writing it out would put a line in the preview that changes nothing.
  if (params.transparent === true) body.background = "transparent";
  if (references.length > 0) {
    body.input_references = references.map((url) => ({ type: "image_url", image_url: { url } }));
  }
  return body;
}

/** POST /videos */
export function buildVideoBody(args: {
  tool: PlaygroundTool;
  params: StudioParams;
  prompt: string;
  aspectRatio: AspectRatio | null;
  firstFrame?: string | null;
  lastFrame?: string | null;
}): RequestBody {
  const { tool, params, prompt, aspectRatio, firstFrame, lastFrame } = args;
  const caps = capsFor(tool);
  const video = caps?.kind === "video" ? caps : null;

  const body: RequestBody = {
    model: tool.providerModel,
    prompt,
    duration: numeric(params.duration) ?? tool.videoDuration ?? 4,
    resolution: params.videoResolution ?? tool.videoResolution ?? "720p",
  };
  put(body, "aspect_ratio", aspectRatio);
  if (video?.seed) put(body, "seed", numeric(params.seed));
  // Only written when the student turned sound OFF: `true` is every audio
  // model's own default, and a silent clip is the ~30% cheaper choice this
  // switch exists to make visible.
  if (video?.generateAudio && params.generateAudio === false) body.generate_audio = false;

  const frames: Record<string, unknown>[] = [];
  if (firstFrame) frames.push({ type: "image_url", image_url: { url: firstFrame }, frame_type: "first_frame" });
  if (lastFrame && video?.frameImages.includes("last_frame")) {
    frames.push({ type: "image_url", image_url: { url: lastFrame }, frame_type: "last_frame" });
  }
  if (frames.length > 0) body.frame_images = frames;
  return body;
}

/** Where a tool's request goes — the line above the JSON in the `</>` panel. */
export function targetFor(tool: PlaygroundTool): string {
  if (tool.modality === "image") return `${OPENROUTER_BASE}/images`;
  if (tool.modality === "video") return `${OPENROUTER_BASE}/videos`;
  return `${OPENROUTER_BASE}/chat/completions`;
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
