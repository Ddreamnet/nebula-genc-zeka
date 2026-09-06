import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readTreasury } from "@/lib/playground/treasury";

/**
 * Admin-only snapshot of "can the OpenRouter balance actually cover the ore
 * we've handed out?".
 *
 * This has to be a server route rather than a direct Supabase call from the
 * admin components (which is how the rest of the panel works) purely because
 * OPENROUTER_API_KEY can never reach the browser. The arithmetic itself lives
 * in lib/playground/treasury.ts, shared with the Playground balance route so
 * an admin's own cevher and this card can't drift apart.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const treasury = await readTreasury(supabase);
  if (!treasury) {
    return NextResponse.json({ error: "openrouter_unreachable" }, { status: 502 });
  }

  return NextResponse.json(treasury);
}
