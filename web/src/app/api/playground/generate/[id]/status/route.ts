import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pollVideo, downloadVideo } from "@/lib/ai/openrouter";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: generation } = await supabase
    .from("ai_generations")
    .select("id, status, openrouter_job_id, output_path, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!generation || generation.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (generation.status === "completed") {
    const { data: signed } = await supabase.storage
      .from("playground-outputs")
      .createSignedUrl(generation.output_path!, 3600);
    // outputPath rides along so the client can settle the transcript row this
    // video belongs to — see /api/playground/chats/settle.
    return NextResponse.json({ status: "completed", videoUrl: signed?.signedUrl, outputPath: generation.output_path });
  }
  if (generation.status === "failed") {
    return NextResponse.json({ status: "failed" });
  }
  if (!generation.openrouter_job_id) {
    return NextResponse.json({ status: "pending" });
  }

  let poll;
  try {
    poll = await pollVideo(generation.openrouter_job_id);
  } catch {
    // Transient hiccup talking to OpenRouter's status endpoint — client keeps polling.
    return NextResponse.json({ status: "pending" });
  }

  if (poll.status === "completed") {
    try {
      const path = `${user.id}/${id}.mp4`;
      const bytes = Buffer.from(await downloadVideo(poll.videoUrl));
      const { error: uploadError } = await supabase.storage
        .from("playground-outputs")
        .upload(path, bytes, { contentType: "video/mp4", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      await supabase.rpc("rpc_finalize_generation", {
        p_generation_id: id,
        p_status: "completed",
        p_real_cost_usd: poll.costUsd,
        p_output_path: path,
      });

      const { data: signed } = await supabase.storage.from("playground-outputs").createSignedUrl(path, 3600);
      return NextResponse.json({ status: "completed", videoUrl: signed?.signedUrl, outputPath: path });
    } catch {
      // The video really did finish on OpenRouter's side — don't leave this stuck as
      // "pending" forever; fail cleanly so the ore gets refunded.
      await supabase.rpc("rpc_finalize_generation", { p_generation_id: id, p_status: "failed" });
      return NextResponse.json({ status: "failed" });
    }
  }

  if (poll.status === "failed") {
    await supabase.rpc("rpc_finalize_generation", { p_generation_id: id, p_status: "failed" });
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({ status: poll.status });
}
