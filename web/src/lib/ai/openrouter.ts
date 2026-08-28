const BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Every call below carries a deadline. Without one, a stalled upstream request
 * holds a Node connection open indefinitely — and this app runs as a single
 * standalone server with no serverless fan-out, so a handful of hung
 * generations is enough to starve everyone else.
 *
 * The budgets differ because the work does: text usually answers in seconds,
 * image generation routinely takes half a minute, and the /videos calls are
 * only ever job bookkeeping (the render itself happens asynchronously and is
 * polled) — except the finished-file download, which really does move bytes.
 */
const TIMEOUT_MS = {
  text: 90_000,
  image: 180_000,
  audio: 180_000,
  job: 30_000,
  download: 120_000,
} as const;

/**
 * Tek yer: tüm modellerin görsel en/boy oranı. OpenRouter'da parametre adı
 * `aspect_ratio` ("9:16" = dikey). Oranı desteklemeyen modelde OpenRouter
 * kendi en yakın boyutuna yuvarlar, ek bir iş gerekmez.
 */
const ASPECT_RATIO = "9:16";

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

export async function generateText(
  messages: ChatMessage[],
  model: string,
): Promise<{ content: string; costUsd: number }> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS.text),
  }).catch(() => {
    throw timeoutError("text generation", TIMEOUT_MS.text);
  });
  if (!res.ok) throw new Error(`OpenRouter text generation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenRouter returned an empty response (possibly content-filtered)");
  return { content, costUsd: data.usage?.cost ?? 0 };
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
): Promise<{ b64: string; mediaType: string; costUsd: number }> {
  const res = await fetch(`${BASE_URL}/images`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      aspect_ratio: ASPECT_RATIO,
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

export async function startVideo(
  prompt: string,
  model: string,
  duration = 4,
  resolution = "720p",
): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE_URL}/videos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, prompt, duration, resolution }),
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

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks: Buffer[] = [];
  let costUsd = 0;
  let buffered = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      let event: { usage?: { cost?: number }; choices?: { delta?: { audio?: { data?: string } } }[] };
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }
      if (event.usage?.cost) costUsd = event.usage.cost;
      const audioData = event.choices?.[0]?.delta?.audio?.data;
      if (audioData) chunks.push(Buffer.from(audioData, "base64"));
    }
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
