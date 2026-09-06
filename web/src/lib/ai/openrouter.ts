import { DEFAULT_ASPECT_RATIO, type AspectRatio } from "@/lib/playground/aspect";

const BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Every call below carries a deadline. Without one, a stalled upstream request
 * holds a Node connection open indefinitely — and this app runs as a single
 * standalone server with no serverless fan-out, so a handful of hung
 * generations is enough to starve everyone else.
 *
 * The budgets differ because the work does: a streamed answer is bounded by
 * the whole answer rather than one response, image generation routinely takes
 * half a minute, and the /videos calls are
 * only ever job bookkeeping (the render itself happens asynchronously and is
 * polled) — except the finished-file download, which really does move bytes.
 */
const TIMEOUT_MS = {
  /**
   * Streaming needs a longer ceiling than a buffered call: the deadline covers
   * the whole answer, not just time-to-first-byte, and a reasoning model can
   * think for a minute before it writes anything a student can see.
   */
  stream: 180_000,
  image: 180_000,
  audio: 180_000,
  job: 30_000,
  download: 120_000,
} as const;

/** Wraps a fetch failure so callers can tell "we gave up" from "it errored". */
function timeoutError(what: string, ms: number): Error {
  return new Error(`OpenRouter ${what} timed out after ${ms}ms`);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * A chat message is either plain text or OpenAI-style content parts. The parts
 * form is how images reach a vision model — verified live against OpenRouter
 * (google/gemini-2.5-flash correctly described a test PNG sent this way):
 *   content: [{ type: "text", text }, { type: "image_url", image_url: { url } }]
 * `url` takes an http(s) URL or a `data:image/...;base64,...` data URL.
 */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

/**
 * Reads an SSE body and yields each parsed `data:` payload.
 *
 * Two details here are load-bearing and were verified against a live stream,
 * not assumed:
 *  - OpenRouter interleaves SSE *comment* lines (`: OPENROUTER PROCESSING`)
 *    to keep the connection warm while a provider is still thinking. They are
 *    not events and must be skipped, or JSON.parse throws on every one.
 *  - the final chunk carries BOTH a `choices` delta and `usage`, so usage can
 *    never be detected by "the event with no choices".
 */
async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split("\n");
      // The tail is whatever came after the last newline — half a line, kept
      // until the rest of it arrives.
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          yield JSON.parse(payload);
        } catch {
          // A malformed chunk is not worth killing a half-written answer over.
        }
      }
    }
  } finally {
    // Releasing the lock lets an abort actually tear the socket down instead
    // of leaving it pinned open by a reader nobody is draining any more.
    reader.releaseLock();
  }
}

export type TextStreamEvent =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "usage"; costUsd: number };

/**
 * Streaming text generation.
 *
 * Replaces the old buffered `generateText`: the student sees words as they are
 * written instead of watching a spinner for the whole answer, and an aborted
 * request stops paying for tokens the moment they stop being wanted.
 *
 * `reasoning` asks the model to expose its thinking as a separate `reasoning`
 * delta channel. Verified live: DeepSeek R1 and GPT-5 Mini both stream it, and
 * a model that has no such channel (Llama 3.3) ignores the parameter rather
 * than erroring — so the flag is safe to send. It is still opt-in per tool,
 * because on a model that only thinks *when asked* (Claude) turning it on buys
 * visible reasoning at the price of billed thinking tokens, and ore is charged
 * at a flat rate per message.
 */
export async function* streamText(
  messages: ChatMessage[],
  model: string,
  options: { reasoning?: boolean; signal?: AbortSignal } = {},
): AsyncGenerator<TextStreamEvent> {
  // Two deadlines, one signal: our own ceiling and the caller's cancellation
  // (a student pressing stop, or the browser hanging up on them).
  const signals = [AbortSignal.timeout(TIMEOUT_MS.stream)];
  if (options.signal) signals.push(options.signal);

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      ...(options.reasoning ? { reasoning: { enabled: true } } : {}),
    }),
    signal: AbortSignal.any(signals),
  }).catch((err) => {
    // A caller-side abort is a deliberate stop, not a timeout — the route
    // settles the partial answer instead of reporting a failure.
    if (options.signal?.aborted) throw err;
    throw timeoutError("text stream", TIMEOUT_MS.stream);
  });

  if (!res.ok || !res.body) {
    throw new Error(`OpenRouter text stream failed: ${res.status} ${await res.text()}`);
  }

  for await (const event of sseEvents(res.body)) {
    const usage = event.usage as { cost?: number } | undefined;
    if (usage?.cost) yield { type: "usage", costUsd: usage.cost };

    const delta = (event.choices as { delta?: { content?: string; reasoning?: string } }[] | undefined)?.[0]?.delta;
    if (delta?.reasoning) yield { type: "reasoning", text: delta.reasoning };
    if (delta?.content) yield { type: "text", text: delta.content };
  }
}

/**
 * `references` turns a plain text-to-image call into image-to-image / editing.
 * Note this is a *different* mechanism from the chat `image_url` content parts
 * above — the /images endpoint takes its own `input_references` array, and the
 * per-model ceiling lives in `supported_parameters.input_references.max`
 * (`maxImageInputs` in the tool catalog mirrors it). Verified live on
 * x-ai/grok-imagine-image-quality: a reference PNG plus "turn this into a
 * planet" returned an edited image and billed $0.05 output + $0.01 per input.
 */
export async function generateImage(
  prompt: string,
  model: string,
  references: string[] = [],
  aspectRatio: AspectRatio = DEFAULT_ASPECT_RATIO,
): Promise<{ b64: string; mediaType: string; costUsd: number }> {
  const res = await fetch(`${BASE_URL}/images`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      aspect_ratio: aspectRatio,
      ...(references.length > 0
        ? { input_references: references.map((url) => ({ type: "image_url", image_url: { url } })) }
        : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS.image),
  }).catch(() => {
    throw timeoutError("image generation", TIMEOUT_MS.image);
  });
  if (!res.ok) throw new Error(`OpenRouter image generation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const image = data.data?.[0];
  if (!image?.b64_json) throw new Error("OpenRouter returned no image (possibly content-filtered)");
  return { b64: image.b64_json, mediaType: image.media_type ?? "image/png", costUsd: data.usage?.cost ?? 0 };
}

/**
 * `firstFrame` turns text-to-video into image-to-video: the picture becomes
 * frame 0 and the model animates out of it.
 *
 * Two things here were verified live rather than assumed (job
 * mQV1rACgRQz8KRGwBTZ2 on x-ai/grok-imagine-video, 1s/480p, $0.052):
 *  - the parameter is `frame_images`, an array of
 *    `{ type, image_url: { url }, frame_type }` — a third mechanism, distinct
 *    from chat `image_url` parts and /images `input_references`;
 *  - a `data:image/...;base64,...` URL is accepted end to end, even though
 *    the cookbook only shows public HTTPS URLs. The returned MP4's first frame
 *    was the uploaded picture, so the provider really does receive it. That is
 *    what lets a student's attachment go straight through without being
 *    published to a public URL first.
 *
 * Which models accept it comes from `supported_frame_images` in
 * GET /videos/models (mirrored by `maxImageInputs` in the tool catalog);
 * OpenAI's Sora 2 Pro is the one live tool that supports no frame images at
 * all, so the catalog leaves it unset and the composer hides the button.
 */
export async function startVideo(
  prompt: string,
  model: string,
  duration = 4,
  resolution = "720p",
  firstFrame?: string,
): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE_URL}/videos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      prompt,
      duration,
      resolution,
      ...(firstFrame
        ? {
            frame_images: [
              { type: "image_url", image_url: { url: firstFrame }, frame_type: "first_frame" },
            ],
          }
        : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS.job),
  }).catch(() => {
    throw timeoutError("video start", TIMEOUT_MS.job);
  });
  if (!res.ok) throw new Error(`OpenRouter video start failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { jobId: data.id };
}

export type VideoPollResult =
  | { status: "pending" | "in_progress" }
  | { status: "completed"; videoUrl: string; costUsd: number }
  | { status: "failed" };

export async function pollVideo(jobId: string): Promise<VideoPollResult> {
  const res = await fetch(`${BASE_URL}/videos/${jobId}`, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS.job),
  }).catch(() => {
    throw timeoutError("video poll", TIMEOUT_MS.job);
  });
  if (!res.ok) throw new Error(`OpenRouter video poll failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.status === "completed") {
    const videoUrl = data.unsigned_urls?.[0];
    if (!videoUrl) return { status: "failed" };
    return { status: "completed", videoUrl, costUsd: data.usage?.cost ?? 0 };
  }
  if (data.status === "failed") return { status: "failed" };
  return { status: data.status === "in_progress" ? "in_progress" : "pending" };
}

/** The video content URL still requires the API key — "unsigned" just means no token embedded in the URL itself. */
export async function downloadVideo(videoUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(videoUrl, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS.download),
  }).catch(() => {
    throw timeoutError("video download", TIMEOUT_MS.download);
  });
  if (!res.ok) throw new Error(`OpenRouter video download failed: ${res.status} ${await res.text()}`);
  return res.arrayBuffer();
}

/** Wraps raw 16-bit PCM samples in a minimal 44-byte RIFF/WAVE header so browsers can play them directly. */
function pcm16ToWav(pcm: Buffer, sampleRate = 24000, channels = 1): Buffer {
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Audio output on OpenRouter is only reachable through the chat/completions
 * endpoint with `stream: true` (a plain request 400s with "Audio output
 * requires stream: true" — verified live, not documented anywhere obvious).
 * The two vendors behind our audio tools return genuinely different raw
 * payloads (also verified live, never assumed):
 *  - OpenAI (gpt-audio, gpt-audio-mini): only accepts `audio.format: "pcm16"`
 *    once streaming — raw headerless PCM16 mono @ 24kHz, so we wrap it in a
 *    WAV header ourselves before it's playable.
 *  - Google (lyria-3-pro-preview, lyria-3-clip-preview): takes no `audio`
 *    param at all and returns one single chunk that's already a complete,
 *    real MP3 file (verified via its ID3 header / ffprobe) — passed through as-is.
 */
export async function generateAudio(
  messages: ChatMessage[],
  model: string,
): Promise<{ audioBuffer: Buffer; mimeType: string; costUsd: number }> {
  const isOpenAiVoice = model.startsWith("openai/");
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      modalities: ["text", "audio"],
      ...(isOpenAiVoice ? { audio: { voice: "alloy", format: "pcm16" } } : {}),
      stream: true,
      stream_options: { include_usage: true },
      messages,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS.audio),
  }).catch(() => {
    throw timeoutError("audio generation", TIMEOUT_MS.audio);
  });
  if (!res.ok || !res.body) throw new Error(`OpenRouter audio generation failed: ${res.status} ${await res.text()}`);

  const chunks: Buffer[] = [];
  let costUsd = 0;

  for await (const event of sseEvents(res.body)) {
    const usage = event.usage as { cost?: number } | undefined;
    if (usage?.cost) costUsd = usage.cost;
    const audioData = (event.choices as { delta?: { audio?: { data?: string } } }[] | undefined)?.[0]?.delta?.audio?.data;
    if (audioData) chunks.push(Buffer.from(audioData, "base64"));
  }

  if (chunks.length === 0) throw new Error("OpenRouter returned no audio (possibly content-filtered)");
  const raw = Buffer.concat(chunks);
  const isWav = isOpenAiVoice;
  return {
    audioBuffer: isWav ? pcm16ToWav(raw) : raw,
    mimeType: isWav ? "audio/wav" : "audio/mpeg",
    costUsd,
  };
}
