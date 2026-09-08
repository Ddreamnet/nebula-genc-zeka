import type { PlaygroundTool } from "@/lib/playground/tools";
import type { AspectRatio } from "@/lib/playground/aspect";
import type { Role, StudioParams } from "@/lib/playground/params";
import { paramDoc } from "@/lib/playground/param-docs";
import {
  buildAudioBody,
  buildImageBody,
  buildTextBody,
  buildVideoBody,
  systemPromptFor,
  targetFor,
  type ChatMessage,
  type RequestBody,
} from "@/lib/playground/request";

/**
 * "Modele ne gönderiyoruz?" — the request the next Oluştur will actually make,
 * written out as JSON.
 *
 * This is the highest-teaching-value panel in the Playground: the curriculum
 * spends a whole week on "how does a request reach an AI", and this shows it
 * on the student's own prompt instead of on a slide. Which means it has to be
 * TRUE — so it no longer writes its own version of the body. It calls the same
 * `buildTextBody` / `buildImageBody` / `buildVideoBody` the generate route
 * calls, with the same sanitised params, and then masks. A dial that reaches
 * the model necessarily reaches this panel, because there is only one builder.
 *
 * Three things are deliberately masked (docs/playground-studio-plan.md §5.3):
 *  - the API key, in every role, always — it lives on the server and never
 *    reaches the browser at all, and the header line says so;
 *  - attached pictures, which are megabyte-long data URLs: shown as a stub
 *    plus their size, because pasting one into a preview panel would bury
 *    every other line;
 *  - the server's own safety locks (personGeneration, moderation, …), which
 *    are not the caller's to see or set — and which, since bodies are built
 *    from the studio whitelist, do not exist in this object either.
 */

export interface PayloadInput {
  tool: PlaygroundTool;
  /** The tool's category id — "web" swaps the system prompt. */
  categoryId?: string | null;
  prompt: string;
  aspectRatio: AspectRatio | null;
  /** Data URLs staged in the composer right now. */
  attachments: string[];
  memory: boolean;
  /** How many prior turns would be resent (text tools with memory on). */
  historyTurns: number;
  /** Whether the thread has a picture that memory would carry as a reference. */
  carriesReference: boolean;
  /** Staff see the real system prompt; a student sees a placeholder. */
  role: Role;
  /** The studio dials as they stand right now. */
  params: StudioParams;
}

export interface PayloadPreview {
  /** "POST https://openrouter.ai/api/v1/images" */
  target: string;
  /** Pretty-printed JSON body. */
  body: string;
  /** One short line per top-level key, in body order — the annotated mode. */
  notes: { key: string; note: string }[];
}

/** "1,2 MB" for a data URL, so the stub says how big the thing it replaced is. */
function dataUrlSize(dataUrl: string): string {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function imageStub(dataUrl: string): string {
  return dataUrl.startsWith("data:") ? `${dataUrl.slice(0, 24)}… (${dataUrlSize(dataUrl)})` : dataUrl;
}

const REMEMBERED_STUB = "<bu sohbette ürettiğin son görsel (imzalı bağlantı)>";

/**
 * Wire-name → the sentence next to it in annotated mode.
 *
 * Every studio dial's line comes from `param-docs.ts`, the same dictionary the
 * (i) bubbles read, so a setting is explained once. Only the fields that are
 * not dials — the request plumbing a student never sets — are spelled out here.
 */
const PLUMBING_NOTES: Record<string, string> = {
  model: "Hangi yapay zeka modeli çalışacak",
  prompt: "Senin yazdığın tarif — modele giden asıl istek",
  messages: "Sohbetin tamamı: sistem talimatı, geçmiş ve son mesajın",
  n: "Kaç sonuç üretilecek",
  stream: "Cevap parça parça mı gelsin (yazarken görürsün)",
  stream_options: "Sonda kullanım ve maliyet bilgisi de gelsin",
  modalities: "Cevap metin mi ses mi olacak",
  audio: "Sesin tonu ve dosya biçimi",
  input_references: "Referans görsel — modele 'buna benzet' demek",
  frame_images: "Videonun ilk (ve varsa son) karesi",
  response_format: "Cevabın hangi biçimde geleceği",
};

/** Wire-name → studio key, for the fields that are dials. */
const DIAL_FOR_FIELD: Record<string, string> = {
  aspect_ratio: "aspectRatio",
  resolution: "resolution",
  quality: "quality",
  output_format: "outputFormat",
  output_compression: "outputCompression",
  background: "transparent",
  seed: "seed",
  duration: "duration",
  generate_audio: "generateAudio",
  temperature: "temperature",
  max_tokens: "maxTokens",
  max_completion_tokens: "maxTokens",
  top_p: "topP",
  top_k: "topK",
  min_p: "minP",
  frequency_penalty: "frequencyPenalty",
  presence_penalty: "presencePenalty",
  repetition_penalty: "repetitionPenalty",
  verbosity: "verbosity",
  stop: "stop",
  reasoning: "reasoning",
};

export function buildPayloadPreview(input: PayloadInput): PayloadPreview {
  const { tool, categoryId, prompt, aspectRatio, attachments, memory, historyTurns, carriesReference, role, params } = input;
  const text = prompt.trim() || "(henüz bir şey yazmadın)";
  const showSystem = role !== "student";

  if (tool.modality === "text" || tool.modality === "audio") {
    // The real system message, assembled by the same function the route uses
    // — persona and a teacher's extra instruction included, so a student can
    // see that picking "Hikâyeci" really did add a line.
    const system = showSystem ? systemPromptFor(tool, categoryId, params) : "<Nebula sistem promptu>";
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      attachments.length > 0
        ? { role: "user", content: [{ type: "text", text }, ...attachments.map((a) => ({ type: "image_url" as const, image_url: { url: imageStub(a) } }))] }
        : { role: "user", content: text },
    ];
    const body = tool.modality === "audio" ? buildAudioBody({ tool, params, messages }) : buildTextBody({ tool, params, messages });
    // The resent transcript is summarised rather than reprinted: twenty past
    // turns would bury the one line a student is looking for, and the count
    // is the part that teaches ("memory on = these many messages go too").
    if (tool.modality === "text" && memory && historyTurns > 0) {
      body.messages = [messages[0], `<bu sohbetten önceki ${historyTurns} mesaj>`, messages[1]];
    }
    return finish(tool, body);
  }

  if (tool.modality === "image") {
    const refs = attachments.map(imageStub);
    if (refs.length === 0 && memory && carriesReference) refs.push(REMEMBERED_STUB);
    return finish(tool, buildImageBody({ tool, params, prompt: text, aspectRatio, references: refs }));
  }

  const firstFrame = attachments[0] ? imageStub(attachments[0]) : memory && carriesReference ? REMEMBERED_STUB : null;
  const lastFrame = params.lastFrame === true && attachments[1] ? imageStub(attachments[1]) : null;
  return finish(tool, buildVideoBody({ tool, params, prompt: text, aspectRatio, firstFrame, lastFrame }));
}

function finish(tool: PlaygroundTool, body: RequestBody): PayloadPreview {
  return {
    target: `POST ${targetFor(tool)}`,
    body: JSON.stringify(body, null, 2),
    notes: Object.keys(body)
      .map((key) => {
        const dial = DIAL_FOR_FIELD[key];
        // A dial explains itself out of the same dictionary the (i) bubble
        // uses; only the plumbing has a line of its own here.
        const note = dial ? paramDoc(dial).kid : PLUMBING_NOTES[key];
        return note ? { key, note } : null;
      })
      .filter((n): n is { key: string; note: string } => n !== null),
  };
}

/** The same request as a copy-pasteable cURL line, with the key still masked. */
export function toCurl(preview: PayloadPreview): string {
  const url = preview.target.replace("POST ", "");
  return [
    `curl -X POST ${url} \\`,
    `  -H "Authorization: Bearer ••••••" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${preview.body}'`,
  ].join("\n");
}
