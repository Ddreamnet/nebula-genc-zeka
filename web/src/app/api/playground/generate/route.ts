import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findTool, generationOreCost } from "@/lib/playground/tools";
import {
  generateText,
  generateImage,
  generateAudio,
  startVideo,
  type ChatMessage,
  type ContentPart,
} from "@/lib/ai/openrouter";

const SYSTEM_PROMPT =
  "Sen Nebula Genç Zeka'nın çocuklara yönelik yaratıcı yapay zeka asistanısın. 10-18 yaş arası öğrencilerle Türkçe, sıcak, meraklandırıcı ve güvenli bir dille konuş. Kısa ve anlaşılır cevaplar ver.";

const WEB_SYSTEM_PROMPT =
  "Sen bir web geliştirme ve oyun kodlama AI'sısın. Kullanıcının tarif ettiği web sitesini, tarayıcı oyununu ya da arayüzü TEK BİR HTML dosyası olarak üret: tüm CSS'i <style> içine, tüm JavaScript'i <script> içine göm — harici dosya, harici link veya CDN kullanma. Kod kaliteli, çalışan ve görsel olarak hoş olsun (kids 10-18 yaş için). SADECE ```html ile başlayıp ``` ile biten TEK bir kod bloğu döndür; kod bloğunun dışına hiçbir açıklama, giriş veya kapanış cümlesi yazma.";

// Session memory for text chat only — caps how much prior conversation gets
// resent as input tokens on every turn. Enforced server-side too (not just
// trimmed client-side) since a client-supplied array can't be trusted to
// self-limit; this is the only guard against someone crafting an
// oversized `history` payload to run up the real OpenRouter bill while
// still paying the same flat per-message ore price.
const HISTORY_LIMIT = 20;

// Attachment limits. The client already downscales to ~1024px before upload,
// so 5MB is a generous ceiling that only trips on a hand-crafted payload —
// it exists because every attached image is billed prompt tokens, and the
// flat per-image ore surcharge only holds if the image is roughly the size
// we told the client to send.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** A base64 payload of n chars decodes to 3n/4 bytes, minus the `=` padding. */
function base64Bytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function isUsableImage(value: unknown): value is string {
  return typeof value === "string" && IMAGE_DATA_URL_RE.test(value) && base64Bytes(value) <= MAX_IMAGE_BYTES;
}

/**
 * Anything that fails validation is dropped rather than 400'd — a student
 * shouldn't lose a typed message because one of three thumbnails came through
 * malformed. The count cap is enforced by the caller against the tool's own
 * `maxImageInputs`.
 */
function sanitizeImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isUsableImage);
}

type HistoryEntry = { role: "user" | "assistant"; content: string; images: string[] };

function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: "user" | "assistant"; content: string; images?: unknown } =>
        typeof m === "object" && m !== null && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
    )
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content, images: m.role === "user" ? sanitizeImages(m.images) : [] }));
}

/**
 * Index of the most recent *user* turn in history, or -1.
 *
 * Note this is deliberately not `history.length - 1`: by the time a follow-up
 * is sent, the last entry is the assistant's previous reply, and the image we
 * want to carry sits one turn further back.
 */
function lastUserTurnIndex(history: HistoryEntry[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return i;
  }
  return -1;
}

function toChatMessage(role: "user" | "assistant", text: string, images: string[]): ChatMessage {
  if (images.length === 0) return { role, content: text };
  const parts: ContentPart[] = [{ type: "text", text }, ...images.map((url) => ({ type: "image_url" as const, image_url: { url } }))];
  return { role, content: parts };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const toolId: string | undefined = body?.toolId;
  const prompt: string | undefined = body?.prompt;

  if (!toolId || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const found = findTool(toolId);
  if (!found || found.tool.status !== "live") {
    return NextResponse.json({ error: "unknown_tool" }, { status: 404 });
  }
  const { tool, category } = found;
  const isWebTool = category?.id === "web";

  // Attachments are capped by the model's own ceiling, not by whatever the
  // client felt like sending — the composer hides its attach button for
  // text-only models, but that's cosmetic and can't be the enforcement point.
  const imageBudget = tool.maxImageInputs ?? 0;
  const attachments = sanitizeImages(body?.attachments).slice(0, imageBudget);

  const history = tool.modality === "text" ? sanitizeHistory(body?.history) : [];

  // Images ride along from the most recent user turn, and only that one.
  // Resending every past image would multiply cost without bound — 20 turns
  // of history at ~1600 prompt tokens per image is 32k tokens on every single
  // message. Carrying one turn is what makes the obvious follow-up ("peki
  // rengi ne?" right after "bu görselde ne var?") work, for at most a few
  // extra images per request.
  const carryIndex = lastUserTurnIndex(history);
  const carried = carryIndex >= 0 ? history[carryIndex].images.slice(0, Math.max(0, imageBudget - attachments.length)) : [];

  // Charge for every image that actually reaches the model, freshly attached
  // or carried forward, so the ore price never understates the real bill.
  const oreCost = generationOreCost(tool, attachments.length + carried.length);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Temporary: Playground is student-only for now, no anonymous access.
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: startRows, error: startError } = await supabase.rpc("rpc_start_generation", {
    p_tool_id: tool.id,
    p_modality: tool.modality,
    p_provider_model: tool.providerModel,
    p_ore_cost: oreCost,
    p_prompt: prompt.trim(),
  });

  if (startError) {
    return NextResponse.json({ error: "start_failed", message: startError.message }, { status: 500 });
  }

  const result = startRows?.[0];
  if (!result?.success) {
    return NextResponse.json({
      gated: true,
      reason: result?.error ?? "insufficient_balance",
      remaining: result?.remaining_ore ?? 0,
    });
  }

  const generationId = result.generation_id;

  try {
    if (tool.modality === "text") {
      const priorTurns = history.map((m, i) =>
        // Only the most recent user turn keeps its images; `carried` is that
        // turn's list, already trimmed to the remaining image budget.
        toChatMessage(m.role, m.content, i === carryIndex ? carried : []),
      );
      const { content, costUsd } = await generateText(
        [
          { role: "system", content: isWebTool ? WEB_SYSTEM_PROMPT : SYSTEM_PROMPT },
          ...priorTurns,
          toChatMessage("user", prompt.trim(), attachments),
        ],
        tool.providerModel,
      );
      await supabase.rpc("rpc_finalize_generation", {
        p_generation_id: generationId,
        p_status: "completed",
        p_real_cost_usd: costUsd,
      });
      return NextResponse.json({
        generationId,
        modality: "text",
        kind: isWebTool ? "code" : "text",
        content,
        remaining: result.remaining_ore,
      });
    }

    if (tool.modality === "image") {
      const { b64, mediaType, costUsd } = await generateImage(prompt.trim(), tool.providerModel, attachments);
      // Extension follows what the model actually returned — Grok Imagine
      // hands back JPEG, so the old hardcoded `.png` produced files that
      // wouldn't open by name once downloaded.
      const ext = mediaType === "image/jpeg" ? "jpg" : mediaType === "image/webp" ? "webp" : "png";
      const path = `${user.id}/${generationId}.${ext}`;
      const bytes = Buffer.from(b64, "base64");
      const { error: uploadError } = await supabase.storage
        .from("playground-outputs")
        .upload(path, bytes, { contentType: mediaType, upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data: signed } = await supabase.storage.from("playground-outputs").createSignedUrl(path, 3600);

      await supabase.rpc("rpc_finalize_generation", {
        p_generation_id: generationId,
        p_status: "completed",
        p_real_cost_usd: costUsd,
        p_output_path: path,
      });
      return NextResponse.json({
        generationId,
        modality: "image",
        imageUrl: signed?.signedUrl,
        remaining: result.remaining_ore,
      });
    }

    if (tool.modality === "audio") {
      const { audioBuffer, mimeType, costUsd } = await generateAudio([{ role: "user", content: prompt.trim() }], tool.providerModel);
      const ext = mimeType === "audio/wav" ? "wav" : "mp3";
      const path = `${user.id}/${generationId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("playground-outputs")
        .upload(path, audioBuffer, { contentType: mimeType, upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data: signed } = await supabase.storage.from("playground-outputs").createSignedUrl(path, 3600);

      await supabase.rpc("rpc_finalize_generation", {
        p_generation_id: generationId,
        p_status: "completed",
        p_real_cost_usd: costUsd,
        p_output_path: path,
      });
      return NextResponse.json({
        generationId,
        modality: "audio",
        audioUrl: signed?.signedUrl,
        remaining: result.remaining_ore,
      });
    }

    // Video: async job — kick off, persist the job id, client polls for completion.
    const { jobId } = await startVideo(prompt.trim(), tool.providerModel, tool.videoDuration ?? 4, tool.videoResolution ?? "720p");
    await supabase.rpc("rpc_attach_video_job", { p_generation_id: generationId, p_job_id: jobId });
    return NextResponse.json({ generationId, modality: "video", remaining: result.remaining_ore });
  } catch (err) {
    await supabase.rpc("rpc_finalize_generation", {
      p_generation_id: generationId,
      p_status: "failed",
    });
    return NextResponse.json(
      { error: "generation_failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
