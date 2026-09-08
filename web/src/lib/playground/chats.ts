import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Nothing older than this is worth a sidebar row; the rest is archived noise. */
const LIMIT = 60;

export interface ChatSummary {
  id: string;
  toolId: string;
  lastMessageAt: string;
  messageCount: number;
  preview: string;
}

/**
 * The caller's chat list, newest activity first.
 *
 * Shared by the `/api/playground/chats` route (the client re-reads the list
 * after every turn) and by the Playground page itself, which renders the first
 * copy on the server so the history panel is filled the moment the page is —
 * rather than mounting empty and asking for it in a second round trip.
 *
 * There is no `title` column on purpose (see the persistence migration): a
 * derived title is another thing to keep correct, and the first thing the
 * student typed is a better label than anything we would generate from it.
 * So the preview is exactly that — the opening user message, trimmed.
 */
export async function listChats(supabase: SupabaseClient<Database>): Promise<ChatSummary[] | null> {
  const { data: chats, error } = await supabase
    .from("playground_chats")
    .select("id, tool_id, last_message_at, message_count")
    .is("archived_at", null)
    .order("last_message_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("[playground] chat list failed", error.message);
    return null;
  }
  if (!chats?.length) return [];

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

  return chats.map((c) => ({
    id: c.id,
    toolId: c.tool_id,
    lastMessageAt: c.last_message_at,
    messageCount: c.message_count,
    preview: preview.get(c.id) ?? "",
  }));
}
