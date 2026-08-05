import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Temporary: Playground is student-only for now, no anonymous access.
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: credit } = await supabase
    .from("playground_credits")
    .select("balance_ore")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = credit?.balance_ore ?? 20;
  return NextResponse.json({ balance });
}
