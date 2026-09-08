import type { RequestBody } from "@/lib/playground/request";
export type { ChatMessage, ContentPart } from "@/lib/playground/request";

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
 * Takes a body built by `lib/playground/request.ts` rather than assembling
 * one here: the `</>` preview panel builds it with the same function, so what
 * a student reads there is byte-for-byte what leaves this fetch. Everything
 * this module still owns is transport — the key, the deadline, the SSE
 * parsing and the cancellation.
 */
export async function* streamText(body: RequestBody, options: { signal?: AbortSignal } = {}): AsyncGenerator<TextStreamEvent> {
  // Two deadlines, one signal: our own ceiling and the caller's cancellation
  // (a student pressing stop, or the browser hanging up on them).
  const signals = [AbortSignal.timeout(TIMEOUT_MS.stream)];
  if (options.signal) signals.push(options.signal);

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
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
 * One image. The body carries the studio's dials — resolution, seed,
 * transparent background, quality, output format — and `input_references`,
 * which turns a plain text-to-image call into image-to-image / editing.
 *
 * Note `input_references` is a *different* mechanism from the chat
 * `image_url` content parts: the /images endpoint takes its own array, and
 * the per-model ceiling lives in `supported_parameters.input_references.max`
 * (`maxImageInputs` in the tool catalog mirrors it). Verified live on
 * x-ai/grok-imagine-image-quality: a reference PNG plus "turn this into a
 * planet" returned an edited image and billed $0.05 output + $0.01 per input.
 */
export async function generateImage(body: RequestBody): Promise<{ b64: string; mediaType: string; costUsd: number }> {
  const res = await fetch(`${BASE_URL}/images`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
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
 * Kicks off a video job. The render itself is asynchronous and polled.
 *
 * `frame_images` in the body turns text-to-video into image-to-video: the
 * picture becomes frame 0 and the model animates out of it, and a second
 * entry with `frame_type: "last_frame"` tells it where to end up.
 *
 * Two things here were verified live rather than assumed (job
 * mQV1rACgRQz8KRGwBTZ2 on x-ai/grok-imagine-video, 1s/480p, $0.052):
 *  - the parameter is `frame_images`, an array of
 *    `{ type, image_url: { url }, frame_type }` — a third mechanism, distinct
 *    from chat `image_url` parts and /images `input_references`;
 *  - a `data:image/...;base64,...` URL is accepted end to end, even though
 *    the cookbook only shows public HTTPS URLs. The returned MP4's first frame
 *    was the uploaded picture, so the provider really does receive it.
 *
 * Which models accept which frames comes from `supported_frame_images` in
 * GET /videos/models, mirrored into `capabilities.generated.ts`; the body
 * builder will not write a frame the catalog does not list.
 */
export async function startVideo(body: RequestBody): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE_URL}/videos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
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
 *
 * Which of the two shapes a body has is decided by the builder, so the voice
 * a student picked in the studio is on the wire the panel showed them.
 */
export async function generateAudio(body: RequestBody): Promise<{ audioBuffer: Buffer; mimeType: string; costUsd: number }> {
  const isOpenAiVoice = typeof body.model === "string" && body.model.startsWith("openai/");
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
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
  return {
    audioBuffer: isOpenAiVoice ? pcm16ToWav(raw) : raw,
    mimeType: isOpenAiVoice ? "audio/wav" : "audio/mpeg",
    costUsd,
  };
}
