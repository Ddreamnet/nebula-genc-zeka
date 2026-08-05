const BASE_URL = "https://openrouter.ai/api/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateText(
  messages: ChatMessage[],
  model: string,
): Promise<{ content: string; costUsd: number }> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`OpenRouter text generation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenRouter returned an empty response (possibly content-filtered)");
  return { content, costUsd: data.usage?.cost ?? 0 };
}

export async function generateImage(
  prompt: string,
  model: string,
): Promise<{ b64: string; mediaType: string; costUsd: number }> {
  const res = await fetch(`${BASE_URL}/images`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, prompt, n: 1 }),
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
  const res = await fetch(`${BASE_URL}/videos/${jobId}`, { headers: headers() });
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
  const res = await fetch(videoUrl, { headers: headers() });
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
