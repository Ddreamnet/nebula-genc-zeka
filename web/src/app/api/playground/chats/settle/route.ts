import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Closes out the one message the generate route can't finish itself.
 *
 * Video is an async job: /generate reserves an empty assistant row and returns
 * its id, then the client polls /generate/[id]/status for minutes. This is
 * where that row finally gets its file. Everything else settles inline.
 *
 * The bucket path comes back from the status route rather than from the client
 * inventing one — rpc_settle_message runs as SECURITY DEFINER, so a path is a
 * write into this user's transcript and must be a value the server produced.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const messageId: string | undefined = body?.messageId;
  const kind: string = typeof body?.kind === "string" ? body.kind : "text";
  const outputPath: string | null = typeof body?.outputPath === "string" ? body.outputPath : null;
  const content: string = typeof body?.content === "string" ? body.content : "";

  if (!messageId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // rpc_settle_message scopes its own UPDATE to auth.uid(), so a stolen message
  // id from another account simply matches no row.
  const { error } = await supabase.rpc("rpc_settle_message", {
    p_message_id: messageId,
    p_content: content,
    p_kind: kind,
    p_output_path: outputPath,
  });
  if (error) {
    console.error("[playground] settle failed", error.message);
    return NextResponse.json({ error: "settle_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
