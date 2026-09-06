import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readAdminOreBalance } from "@/lib/playground/treasury";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in accounts only — anonymous/public access was removed, not merely
  // bypassed. Students, teachers and admins all reach the Playground; what
  // differs is how a generation is paid for (wallet / unlimited / treasury).
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  /**
   * Neither admins nor teachers hold a wallet — rpc_start_generation skips the
   * gate and the debit for both — but they are told two different things,
   * because two different things are true.
   *
   * An admin's cevher *is* the OpenRouter balance: they are the person topping
   * the account up, and showing them anything else would mean the figure they
   * read differs from the money that is actually there. So they get the
   * treasury, converted at the same realized rate the admin panel shows.
   *
   * A teacher has no allowance to manage and no way to top one up (the grant
   * RPC is admin-only), so a number would only be a countdown they can't act
   * on — and running out mid-lesson is the worst possible failure. They get
   * "unlimited", and the composer stops gating on balance entirely.
   */
  const [{ data: isAdmin }, { data: isTeacher }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: user.id, _role: "teacher" }),
  ]);

  if (isAdmin) {
    // If OpenRouter can't be reached we fall through to the wallet rather than
    // inventing a balance — an admin who has never been granted ore then sees
    // 0, which is the honest answer while the real figure is unknown.
    const ore = await readAdminOreBalance(supabase);
    if (ore !== null) return NextResponse.json({ balance: ore, source: "openrouter" });
  }

  if (isTeacher) {
    // `balance` is a placeholder that only matters to a client that ignores
    // `unlimited`; 0 rather than a big number so that failure mode is a gated
    // composer, never a balance nobody verified.
    return NextResponse.json({ balance: 0, unlimited: true });
  }

  const { data: credit } = await supabase
    .from("playground_credits")
    .select("balance_ore")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = credit?.balance_ore ?? 20;
  return NextResponse.json({ balance });
}
