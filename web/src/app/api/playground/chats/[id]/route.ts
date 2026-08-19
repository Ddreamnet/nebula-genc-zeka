import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Same hour the generate route signs its fresh output URLs for. */
const SIGN_TTL = 3600;

/**
 * One transcript, ready to drop straight into the composer's message list.
 *
 * Media is stored as a bucket path, never a URL: signed links expire, so a URL
 * persisted at generation time would be dead by the time anyone reopened the
 * chat. They are re-signed here, on read.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: chat } = await supabase
    .from("playground_chats")
    .select("id, tool_id")
    .eq("id", id)
    .maybeSingle();
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("playground_chat_messages")
    .select("role, content, kind, output_path, tool_id, seq")
    .eq("chat_id", id)
    .order("seq", { ascending: true });

  if (error) {
    console.error("[playground] transcript failed", error.message);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const paths = (rows ?? []).map((r) => r.output_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("playground-outputs").createSignedUrls(paths, SIGN_TTL);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  const messages = (rows ?? []).map((r) => {
    const url = r.output_path ? signed.get(r.output_path) : undefined;
    return {
      role: r.role,
      content: r.content ?? "",
      kind: r.kind,
      toolId: r.tool_id ?? undefined,
      imageUrl: r.kind === "image" ? url : undefined,
      videoUrl: r.kind === "video" ? url : undefined,
      audioUrl: r.kind === "audio" ? url : undefined,
    };
  });

  return NextResponse.json({ id: chat.id, toolId: chat.tool_id, messages });
}

/** Soft delete — rpc_archive_chat sets archived_at, so a mis-tap is recoverable. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { error } = await supabase.rpc("rpc_archive_chat", { p_chat_id: id });
  if (error) {
    console.error("[playground] archive failed", error.message);
    return NextResponse.json({ error: "archive_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
