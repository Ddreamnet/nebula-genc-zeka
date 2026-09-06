import { pollVideo, downloadVideo } from "@/lib/ai/openrouter";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ReconcileResult =
  | { status: "pending" | "in_progress" }
  | { status: "completed"; outputPath: string }
  | { status: "failed" };

/**
 * Brings one video generation to a terminal state.
 *
 * Shared by the status route the browser polls and by the sweeper that runs
 * when nobody is watching, because the failure this fixes is precisely that
 * the two used to be the same code path: the poll loop lived only in the
 * student's tab, so closing it before a render finished left the row `pending`
 * forever — ore spent, file never fetched, and the transcript showing an empty
 * bubble on every future visit.
 */
export async function reconcileVideo(
  supabase: Supabase,
  userId: string,
  generationId: string,
  jobId: string,
): Promise<ReconcileResult> {
  let poll;
  try {
    poll = await pollVideo(jobId);
  } catch {
    // Transient hiccup talking to OpenRouter's status endpoint — stay pending
    // and let the next poll (or the next sweep) try again.
    return { status: "pending" };
  }

  if (poll.status === "failed") {
    await supabase.rpc("rpc_finalize_generation", { p_generation_id: generationId, p_status: "failed" });
    return { status: "failed" };
  }

  if (poll.status !== "completed") return { status: poll.status };

  try {
    const path = `${userId}/${generationId}.mp4`;
    const bytes = Buffer.from(await downloadVideo(poll.videoUrl));
    const { error: uploadError } = await supabase.storage
      .from("playground-outputs")
      .upload(path, bytes, { contentType: "video/mp4", upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    await supabase.rpc("rpc_finalize_generation", {
      p_generation_id: generationId,
      p_status: "completed",
      p_real_cost_usd: poll.costUsd,
      p_output_path: path,
    });
    return { status: "completed", outputPath: path };
  } catch {
    // The render really did finish upstream, so leaving this pending would
    // wedge it forever. Failing cleanly is what triggers the ore refund.
    await supabase.rpc("rpc_finalize_generation", { p_generation_id: generationId, p_status: "failed" });
    return { status: "failed" };
  }
}

/**
 * Writes a finished video into the transcript row reserved for it.
 *
 * The browser does this itself through /api/playground/chats/settle when it is
 * still open. The sweeper has to do it server-side, because the whole point is
 * that nobody is there to ask. `rpc_settle_message` is a plain keyed update,
 * so both paths running is harmless.
 */
export async function settleVideoMessage(supabase: Supabase, generationId: string, outputPath: string) {
  const { data: message } = await supabase
    .from("playground_chat_messages")
    .select("id")
    .eq("generation_id", generationId)
    .eq("role", "assistant")
    .maybeSingle();
  if (!message) return;

  const { error } = await supabase.rpc("rpc_settle_message", {
    p_message_id: message.id,
    p_content: "",
    p_kind: "video",
    p_output_path: outputPath,
  });
  if (error) console.error("[playground] video settle failed", error.message);
}
