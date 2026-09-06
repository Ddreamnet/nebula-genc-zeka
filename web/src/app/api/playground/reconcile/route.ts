import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reconcileVideo, settleVideoMessage } from "@/lib/playground/video";

/**
 * Finishes the work the student's browser was not around to finish.
 *
 * Video is the one asynchronous modality: ore is debited up front and the file
 * lands minutes later, and until now the only thing driving that to completion
 * was a poll loop inside the open tab. Close it — navigate away, lock the
 * phone, lose signal — and the row stayed `pending` forever: the ore was gone,
 * the finished render was never fetched from OpenRouter, and reopening the
 * chat showed an empty bubble with no way to ever fill it.
 *
 * Called once when the Playground mounts, so it runs exactly when the student
 * comes back — which is also when they would notice the hole.
 */

/** Newer than this and the tab that started it is probably still polling. */
const MIN_AGE_SECONDS = 45;

/**
 * Past this, a generation that never reached a terminal state is written off
 * and refunded. It covers two cases the poller cannot: a video whose job id
 * was never persisted (the process died between starting the render and
 * recording it, so there is nothing left to poll), and a text stream whose
 * server went away mid-answer. Comfortably longer than the client's own
 * 10-minute video deadline, so nothing live is ever written off.
 */
const WRITE_OFF_MINUTES = 25;

/** One request should not turn into a dozen video downloads. */
const BATCH = 4;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const staleBefore = new Date(Date.now() - MIN_AGE_SECONDS * 1000).toISOString();
  const writeOffBefore = new Date(Date.now() - WRITE_OFF_MINUTES * 60_000).toISOString();

  const { data: pending } = await supabase
    .from("ai_generations")
    .select("id, modality, openrouter_job_id, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("created_at", staleBefore)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  let settled = 0;

  for (const row of pending ?? []) {
    const tooOld = row.created_at < writeOffBefore;

    if (row.modality === "video" && row.openrouter_job_id) {
      const result = await reconcileVideo(supabase, user.id, row.id, row.openrouter_job_id);
      if (result.status === "completed") {
        await settleVideoMessage(supabase, row.id, result.outputPath);
        settled++;
      } else if (result.status === "failed") {
        settled++;
      }
      continue;
    }

    // Nothing left to poll. Refund rather than leave the ore in limbo —
    // rpc_finalize_generation only pays out on a row still in 'pending', so a
    // race with a late-arriving settle cannot double-refund.
    if (tooOld) {
      await supabase.rpc("rpc_finalize_generation", { p_generation_id: row.id, p_status: "failed" });
      settled++;
    }
  }

  return NextResponse.json({ settled });
}
