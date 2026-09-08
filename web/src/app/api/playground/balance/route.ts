import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readBalance } from "@/lib/playground/balance";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Signed-in accounts only — anonymous/public access was removed, not merely
  // bypassed. Students, teachers and admins all reach the Playground; what
  // differs is how a generation is paid for (wallet / unlimited / treasury).
  //
  // getClaims, not getUser: the token is verified locally against the
  // project's signing key, which is one network round trip fewer on a call the
  // composer makes after every single generation.
  if (!claims || claims.is_anonymous === true) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const info = await readBalance(supabase, claims.sub);
  return NextResponse.json(info.unlimited ? { balance: 0, unlimited: true } : { balance: info.balance });
}
