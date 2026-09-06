import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reconcileVideo } from "@/lib/playground/video";

const SIGN_TTL = 3600;

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

  // Already settled — possibly by the sweeper while this tab was closed.
  if (generation.status === "completed") {
    const { data: signed } = await supabase.storage
      .from("playground-outputs")
      .createSignedUrl(generation.output_path!, SIGN_TTL);
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

  // The poll/download/upload/finalize sequence lives in one place so the
  // sweeper behaves identically when the student's tab is gone.
  const result = await reconcileVideo(supabase, user.id, id, generation.openrouter_job_id);

  if (result.status === "completed") {
    const { data: signed } = await supabase.storage
      .from("playground-outputs")
      .createSignedUrl(result.outputPath, SIGN_TTL);
    return NextResponse.json({ status: "completed", videoUrl: signed?.signedUrl, outputPath: result.outputPath });
  }

  return NextResponse.json({ status: result.status });
}
