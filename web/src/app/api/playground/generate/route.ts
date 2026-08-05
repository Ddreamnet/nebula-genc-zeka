import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findTool } from "@/lib/playground/tools";
import { generateText, generateImage, generateAudio, startVideo, type ChatMessage } from "@/lib/ai/openrouter";

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

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        typeof m === "object" && m !== null && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
    )
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const toolId: string | undefined = body?.toolId;
  const prompt: string | undefined = body?.prompt;
  const history = sanitizeHistory(body?.history);

  if (!toolId || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const found = findTool(toolId);
  if (!found || found.tool.status !== "live") {
    return NextResponse.json({ error: "unknown_tool" }, { status: 404 });
  }
  const { tool, category } = found;
  const isWebTool = category?.id === "web";

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
    p_ore_cost: tool.oreCost,
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
      const { content, costUsd } = await generateText(
        [
          { role: "system", content: isWebTool ? WEB_SYSTEM_PROMPT : SYSTEM_PROMPT },
          ...history,
          { role: "user", content: prompt.trim() },
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
      const { b64, mediaType, costUsd } = await generateImage(prompt.trim(), tool.providerModel);
      const path = `${user.id}/${generationId}.png`;
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
