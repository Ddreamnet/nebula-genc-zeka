import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pollVideo } from "@/lib/ai/openrouter";

/**
 * Called when the browser gives up waiting on a video job.
 *
 * Without this the ore was simply lost: `rpc_start_generation` debits up front,
 * the status route only refunds on an explicit `failed`, and a job that never
 * resolved left the row stuck in `processing` forever — student charged, no
 * video, no refund, and (with no chat persistence yet) no way back to it.
 *
 * One last poll first, because "the client's patience ran out" and "the job
 * failed" are different things — if it finished in the meantime the student
 * should get what they paid for rather than a refund they didn't ask for.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: generation } = await supabase
    .from("ai_generations")
    .select("id, status, openrouter_job_id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!generation || generation.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Already settled one way or the other — nothing owed, nothing to do.
  if (generation.status === "completed" || generation.status === "failed") {
    return NextResponse.json({ status: generation.status, refunded: false });
  }

  if (generation.openrouter_job_id) {
    try {
      const poll = await pollVideo(generation.openrouter_job_id);
      if (poll.status === "completed") {
        // Let the status route do the download/upload/finalize — it already
        // owns that path, and duplicating it here is how the two drift apart.
        return NextResponse.json({ status: "completed", refunded: false });
      }
    } catch {
      // Poll endpoint unreachable; fall through and refund rather than
      // leaving the student charged on the strength of a network hiccup.
    }
  }

  await supabase.rpc("rpc_finalize_generation", { p_generation_id: id, p_status: "failed" });
  return NextResponse.json({ status: "failed", refunded: true });
}
