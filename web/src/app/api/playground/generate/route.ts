import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findTool, generationOreCost } from "@/lib/playground/tools";
import { readAdminOreBalance } from "@/lib/playground/treasury";
import {
  streamText,
  generateImage,
  generateAudio,
  startVideo,
  type ChatMessage,
  type ContentPart,
} from "@/lib/ai/openrouter";
import { isAspectRatio, DEFAULT_ASPECT_RATIO } from "@/lib/playground/aspect";

const SYSTEM_PROMPT =
  "Sen Nebula Genç Zeka'nın çocuklara yönelik yaratıcı yapay zeka asistanısın. 10-18 yaş arası öğrencilerle Türkçe, sıcak, meraklandırıcı ve güvenli bir dille konuş. Kısa ve anlaşılır cevaplar ver.";

const WEB_SYSTEM_PROMPT =
  "Sen bir web geliştirme ve oyun kodlama AI'sısın. Kullanıcının tarif ettiği web sitesini, tarayıcı oyununu ya da arayüzü TEK BİR HTML dosyası olarak üret: tüm CSS'i <style> içine, tüm JavaScript'i <script> içine göm — harici dosya, harici link veya CDN kullanma. Kod kaliteli, çalışan ve görsel olarak hoş olsun (kids 10-18 yaş için). SADECE ```html ile başlayıp ``` ile biten TEK bir kod bloğu döndür; kod bloğunun dışına hiçbir açıklama, giriş veya kapanış cümlesi yazma. ÖNEMLİ: Sayfa güvenli bir sandbox içinde önizleniyor — localStorage, sessionStorage ve çerezler ERİŞİLEMEZ ve kullanılırsa sayfa hata verip çalışmaz. Skor, ilerleme, kayıt gibi her şeyi sadece JavaScript değişkenlerinde tut.";

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

/** How long a signed input URL needs to live — just long enough to be fetched. */
const INPUT_SIGN_TTL = 3600;

/**
 * Signed URLs for the pictures attached to the most recent user turn of a
 * chat, read from storage rather than from the request.
 *
 * Only the newest turn is looked up, matching the inline carry rule above:
 * the point is to make a direct follow-up work, not to resend an album.
 */
async function loadPreviousTurnInputs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chatId: string,
  limit: number,
): Promise<string[]> {
  const { data: rows } = await supabase
    .from("playground_chat_messages")
    .select("generation_id")
    .eq("chat_id", chatId)
    .eq("role", "user")
    .not("generation_id", "is", null)
    .order("seq", { ascending: false })
    .limit(1);

  const generationId = rows?.[0]?.generation_id;
  if (!generationId) return [];

  // RLS keeps this to the caller's own rows, and the write path already
  // refused any path outside their folder.
  const { data: inputs } = await supabase
    .from("playground_generation_inputs")
    .select("path")
    .eq("generation_id", generationId)
    .order("seq", { ascending: true })
    .limit(limit);
  if (!inputs?.length) return [];

  const { data: signed } = await supabase.storage
    .from("playground-inputs")
    .createSignedUrls(inputs.map((i) => i.path), INPUT_SIGN_TTL);

  return (signed ?? []).map((s) => s.signedUrl).filter((u): u is string => !!u);
}

/**
 * A signed URL for the most recent picture this chat produced, or [].
 *
 * This is what the composer's memory switch buys on the image/video side.
 * Image models are one-shot and stateless: without an explicit reference,
 * "same character, now surprised" draws a different character, which is why
 * week 1's sticker-pack task came back as twelve unrelated faces.
 *
 * Only the newest output is looked up, matching the inline carry rule for
 * text: the point is to continue from the last frame, not to resend a gallery
 * — and every extra reference is billed to the student.
 *
 * Signed here from a stored path, never taken from the request. RLS keeps the
 * lookup to the caller's own rows; forwarding a client-supplied URL to the
 * model would be an SSRF hole and could point at another student's file.
 */
async function loadLastOutputImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chatId: string,
): Promise<string[]> {
  const { data: rows } = await supabase
    .from("playground_chat_messages")
    .select("output_path")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .eq("kind", "image")
    .not("output_path", "is", null)
    .order("seq", { ascending: false })
    .limit(1);

  const path = rows?.[0]?.output_path;
  if (!path) return [];

  const { data: signed } = await supabase.storage
    .from("playground-outputs")
    .createSignedUrl(path, INPUT_SIGN_TTL);
  return signed?.signedUrl ? [signed.signedUrl] : [];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const toolId: string | undefined = body?.toolId;
  const prompt: string | undefined = body?.prompt;
  // Null on the first message of a thread: rpc_append_turn opens the chat and
  // hands back the id the client keeps for the rest of the conversation.
  const chatId: string | null = typeof body?.chatId === "string" ? body.chatId : null;
  // The composer's memory switch. Absent means on — an older client (or a
  // reconnect from a cached bundle) keeps the behaviour it was built against.
  const memory: boolean = body?.memory !== false;
  // Anything that isn't one of the offered ratios falls back to the default
  // rather than 400-ing: the value is cosmetic, and a student shouldn't lose a
  // typed prompt because a stale tab sent a ratio we no longer list.
  const aspectRatio = isAspectRatio(body?.aspectRatio) ? body.aspectRatio : DEFAULT_ASPECT_RATIO;

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

  // Memory off means the transcript is not resent at all: the model answers
  // this one message and nothing else. Enforced here rather than trusted to
  // the client, which is also what stops a crafted payload from re-adding
  // history the student switched off.
  const history = tool.modality === "text" && memory ? sanitizeHistory(body?.history) : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in accounts only — anonymous/public access was removed, not merely
  // bypassed. Students, teachers and admins all reach the Playground; what
  // differs is how a generation is paid for (wallet / unlimited / treasury).
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Images ride along from the most recent user turn, and only that one.
  // Resending every past image would multiply cost without bound — 20 turns
  // of history at ~1600 prompt tokens per image is 32k tokens on every single
  // message. Carrying one turn is what makes the obvious follow-up ("peki
  // rengi ne?" right after "bu görselde ne var?") work, for at most a few
  // extra images per request.
  const carryIndex = lastUserTurnIndex(history);
  const carryRoom = Math.max(0, imageBudget - attachments.length);
  const carriedInline = carryIndex >= 0 ? history[carryIndex].images.slice(0, carryRoom) : [];

  // A reopened chat has no data URLs left to carry — the browser only ever
  // held them for the life of the tab. The previous turn's pictures are read
  // back from storage instead, so "peki rengi ne?" still works tomorrow.
  //
  // These are signed by us from a stored path, never taken from the request:
  // forwarding a client-supplied URL to the model would be an SSRF hole and
  // could point at another student's file.
  const carriedStored =
    carryIndex >= 0 && carriedInline.length === 0 && chatId && carryRoom > 0
      ? await loadPreviousTurnInputs(supabase, chatId, carryRoom)
      : [];
  const carried = [...carriedInline, ...carriedStored];

  // The image/video side of the same switch. Skipped entirely when the student
  // attached something themselves — a picture they just picked is a more
  // deliberate instruction than one we remembered for them, and the budget is
  // small enough that filling it with both would push theirs out.
  const remembered =
    memory && chatId && (tool.modality === "image" || tool.modality === "video") && attachments.length === 0 && imageBudget > 0
      ? await loadLastOutputImage(supabase, chatId)
      : [];

  // Charge for every image that actually reaches the model, freshly attached
  // or carried forward, so the ore price never understates the real bill.
  // (IMAGE_INPUT_ORE.video is 0 — providers fold the frame image into the
  // clip's price — so a remembered first frame costs a student nothing.)
  const oreCost = generationOreCost(tool, attachments.length + carried.length + remembered.length);

  /**
   * Staff don't spend a wallet (see rpc_start_generation), so the balance sent
   * back to them isn't one — and the two kinds of staff get different answers.
   *
   * An admin spends the OpenRouter balance itself, so they get the treasury in
   * cevher: the same number /api/playground/balance and the admin panel's kasa
   * card report. Read AFTER the generation, so the figure they see already
   * reflects what they just spent (as far as OpenRouter's own usage endpoint
   * has caught up).
   *
   * A teacher has no allowance at all, so there is no number to report — the
   * response carries `unlimited` instead and the composer stops gating.
   */
  const [{ data: isAdmin }, { data: isTeacher }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: user.id, _role: "teacher" }),
  ]);
  const unlimited = !!isTeacher && !isAdmin;
  const remainingOre = async (walletRemaining: number) =>
    isAdmin ? ((await readAdminOreBalance(supabase)) ?? walletRemaining) : walletRemaining;

  const { data: startRows, error: startError } = await supabase.rpc("rpc_start_generation", {
    p_tool_id: tool.id,
    p_modality: tool.modality,
    p_provider_model: tool.providerModel,
    p_ore_cost: oreCost,
    p_prompt: prompt.trim(),
  });

  if (startError) {
    // Detail stays server-side: these messages carry Postgres/RPC internals and
    // the browser can't do anything useful with them anyway.
    console.error("[playground] rpc_start_generation failed", startError.message);
    return NextResponse.json({ error: "start_failed" }, { status: 500 });
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

  // ---- Transcript ----------------------------------------------------
  // Written after the balance gate, so a refused generation never leaves a
  // turn behind, and before the model call, so the assistant's row already
  // exists to be filled in — including minutes later, when an async video
  // finally lands. Failure here is deliberately non-fatal: losing the history
  // of a generation is worth much less than the generation itself.
  const { data: turnRows, error: turnError } = await supabase.rpc("rpc_append_turn", {
    p_chat_id: chatId,
    p_tool_id: tool.id,
    p_user_content: prompt.trim(),
    p_generation_id: generationId,
  });
  if (turnError) console.error("[playground] rpc_append_turn failed", turnError.message);
  const turn = turnRows?.[0];
  const thread = {
    chatId: turn?.chat_id ?? chatId,
    assistantMessageId: turn?.assistant_message_id ?? null,
  };

  /** Fills the placeholder assistant row reserved above. */
  const settle = async (kind: string, content: string, outputPath?: string) => {
    if (!thread.assistantMessageId) return;
    const { error } = await supabase.rpc("rpc_settle_message", {
      p_message_id: thread.assistantMessageId,
      p_content: content,
      p_kind: kind,
      p_output_path: outputPath ?? null,
    });
    if (error) console.error("[playground] rpc_settle_message failed", error.message);
  };

  /**
   * Text answers stream; every other modality still replies as one JSON body.
   *
   * The split is deliberate rather than uniform: an image, a sound file or a
   * video job has nothing to show until it is finished, so streaming them
   * would add a protocol for no gain. Text is the one place where a partial
   * answer is worth more than a spinner.
   *
   * Everything before this point — validation, the balance gate, opening the
   * thread — still answers as JSON, so a refusal is a plain response the
   * client can read without touching a reader. Only once the generation is
   * certain to run does the response become a stream.
   */
  if (tool.modality === "text") {
    const priorTurns = history.map((m, i) =>
      // Only the most recent user turn keeps its images; `carried` is that
      // turn's list, already trimmed to the remaining image budget.
      toChatMessage(m.role, m.content, i === carryIndex ? carried : []),
    );
    const messages: ChatMessage[] = [
      { role: "system", content: isWebTool ? WEB_SYSTEM_PROMPT : SYSTEM_PROMPT },
      ...priorTurns,
      toChatMessage("user", prompt.trim(), attachments),
    ];
    const kind = isWebTool ? "code" : "text";

    // Cancels the upstream call when the student presses stop or the browser
    // hangs up. `request.signal` covers the disconnect; `stop` covers the
    // explicit press, which arrives as the same disconnect once the client
    // aborts its fetch.
    const upstream = new AbortController();
    request.signal.addEventListener("abort", () => upstream.abort(), { once: true });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (event: string, data: unknown) => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            // The client is gone. Stop writing, but let the loop below finish
            // settling the transcript — that work is for the database, not
            // for the socket.
            open = false;
          }
        };

        // Sent before the first token so the client can bind this stream to a
        // thread immediately: an answer that lands after the student has
        // navigated still knows which chat row it belongs to.
        send("meta", { generationId, ...thread, kind });

        let answer = "";
        let costUsd: number | null = null;

        try {
          for await (const event of streamText(messages, tool.providerModel, {
            reasoning: tool.reasoning,
            signal: upstream.signal,
          })) {
            if (event.type === "usage") {
              costUsd = event.costUsd;
            } else if (event.type === "reasoning") {
              send("reasoning", { text: event.text });
            } else {
              answer += event.text;
              send("delta", { text: event.text });
            }
          }

          if (!answer.trim()) throw new Error("empty response (possibly content-filtered)");

          await supabase.rpc("rpc_finalize_generation", {
            p_generation_id: generationId,
            p_status: "completed",
            p_real_cost_usd: costUsd ?? undefined,
          });
          await settle(kind, answer);
          send("done", { remaining: await remainingOre(result.remaining_ore), unlimited });
        } catch (err) {
          // A stop is not a failure. The model wrote real tokens and
          // OpenRouter billed them, so the generation settles as completed and
          // the ore stays spent — refunding here would make "press stop" a way
          // to read half an answer for free.
          //
          // The real cost is left null rather than zeroed: usage only arrives
          // on the final chunk, which an aborted stream never receives, and
          // recording 0 would quietly under-report the treasury spend.
          if (upstream.signal.aborted) {
            await supabase.rpc("rpc_finalize_generation", {
              p_generation_id: generationId,
              p_status: "completed",
              p_real_cost_usd: costUsd ?? undefined,
            });
            await settle(kind, answer);
          } else {
            await supabase.rpc("rpc_finalize_generation", {
              p_generation_id: generationId,
              p_status: "failed",
            });
            // Whatever arrived before the break is still the student's — it is
            // written to the transcript so reopening the chat doesn't show an
            // empty bubble where half an answer had been.
            if (answer.trim()) await settle(kind, answer);
            console.error("[playground] stream failed", tool.id, err instanceof Error ? err.message : err);
            send("error", {});
          }
        } finally {
          open = false;
          try {
            controller.close();
          } catch {
            // Already closed by the client hanging up.
          }
        }
      },
      cancel() {
        upstream.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Without this a reverse proxy will happily buffer the whole answer
        // and hand it over in one piece, which looks exactly like no
        // streaming at all.
        "X-Accel-Buffering": "no",
      },
    });
  }

  try {
    if (tool.modality === "image") {
      const { b64, mediaType, costUsd } = await generateImage(
        prompt.trim(),
        tool.providerModel,
        [...attachments, ...remembered],
        aspectRatio,
      );
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
      await settle("image", "", path);
      return NextResponse.json({
        generationId,
        ...thread,
        modality: "image",
        imageUrl: signed?.signedUrl,
        remaining: await remainingOre(result.remaining_ore),
        unlimited,
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
      await settle("audio", "", path);
      return NextResponse.json({
        generationId,
        ...thread,
        modality: "audio",
        audioUrl: signed?.signedUrl,
        remaining: await remainingOre(result.remaining_ore),
        unlimited,
      });
    }

    // Video: async job — kick off, persist the job id, client polls for completion.
    // An attached picture becomes the clip's first frame (image-to-video); the
    // catalog only allows one, and `attachments` is already capped to the
    // tool's own `maxImageInputs`, so Sora 2 Pro — which supports no frame
    // image — can never be handed one even if the client sends it.
    // With memory on and nothing attached, the clip animates out of the last
    // picture this chat made — "draw my character, now make it move" in two
    // messages. NOTE: the data-URL form of frame_images is the one verified
    // live (see startVideo); this passes a signed HTTPS URL instead, which is
    // the form OpenRouter's own cookbook documents but has not been exercised
    // here yet. A rejected reference fails the job, which refunds — it cannot
    // silently produce an unrelated clip.
    const { jobId } = await startVideo(
      prompt.trim(),
      tool.providerModel,
      tool.videoDuration ?? 4,
      tool.videoResolution ?? "720p",
      attachments[0] ?? remembered[0],
    );
    await supabase.rpc("rpc_attach_video_job", { p_generation_id: generationId, p_job_id: jobId });
    // No settle() here: the row stays empty until the poller reports the file,
    // which is why its id is reserved up front and handed to the client.
    return NextResponse.json({
      generationId,
      ...thread,
      modality: "video",
      remaining: await remainingOre(result.remaining_ore),
      unlimited,
    });
  } catch (err) {
    await supabase.rpc("rpc_finalize_generation", {
      p_generation_id: generationId,
      p_status: "failed",
    });
    // Same reasoning as above, with an extra edge: this one wraps OpenRouter's
    // raw response body, which would otherwise put upstream provider internals
    // in front of a 10-year-old.
    console.error("[playground] generation failed", tool.id, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
