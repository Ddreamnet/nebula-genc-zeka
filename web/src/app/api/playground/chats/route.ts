import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listChats } from "@/lib/playground/chats";

/**
 * The student's chat list, newest activity first. The shape and the query live
 * in lib/playground/chats.ts, shared with the Playground page's server render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const chats = await listChats(supabase);
  if (chats === null) return NextResponse.json({ error: "list_failed" }, { status: 500 });
  return NextResponse.json({ chats });
}
