import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Nothing older than this is worth a sidebar row; the rest is archived noise. */
const LIMIT = 60;

/**
 * The student's chat list, newest activity first.
 *
 * There is no `title` column on purpose (see the persistence migration): a
 * derived title is another thing to keep correct, and the first thing the
 * student typed is a better label than anything we would generate from it.
 * So the preview is exactly that — the opening user message, trimmed.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: chats, error } = await supabase
    .from("playground_chats")
    .select("id, tool_id, last_message_at, message_count")
    .is("archived_at", null)
    .order("last_message_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[playground] chat list failed", error.message);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  if (!chats?.length) return NextResponse.json({ chats: [] });

  // One extra round trip for every preview at once, rather than one per chat.
  // RLS already limits these rows to this user, so no filter on user_id here.
  const { data: openers } = await supabase
    .from("playground_chat_messages")
    .select("chat_id, content, seq")
    .in(
      "chat_id",
      chats.map((c) => c.id),
    )
    .eq("role", "user")
    .order("seq", { ascending: true });

  // Lowest seq per chat wins — the rows arrive sorted, so first write sticks.
  const preview = new Map<string, string>();
  for (const m of openers ?? []) {
    if (!preview.has(m.chat_id) && m.content?.trim()) preview.set(m.chat_id, m.content.trim());
  }

  return NextResponse.json({
    chats: chats.map((c) => ({
      id: c.id,
      toolId: c.tool_id,
      lastMessageAt: c.last_message_at,
      messageCount: c.message_count,
      preview: preview.get(c.id) ?? "",
    })),
  });
}
