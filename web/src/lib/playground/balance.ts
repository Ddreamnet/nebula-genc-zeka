import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { readAdminOreBalance } from "@/lib/playground/treasury";

export interface BalanceInfo {
  /** Cevher left. Meaningless (0) when `unlimited` is true. */
  balance: number;
  /** A teacher — no allowance at all, so nothing to count down. */
  unlimited: boolean;
  /** The account's role, for the parts of the UI that differ by it. */
  role: "admin" | "teacher" | "student";
  /**
   * The figure is a placeholder the caller should refresh: an admin read with
   * `treasury: false`, whose real balance lives at OpenRouter and was not
   * fetched.
   */
  stale?: boolean;
}

/**
 * What the composer gates on, for one signed-in account.
 *
 * Shared by `/api/playground/balance` (re-read after every generation) and by
 * the Playground page, which renders the first figure on the server so the
 * header never flashes a placeholder number before the real one arrives.
 *
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
export async function readBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: {
    /**
     * Whether an admin's figure is fetched from OpenRouter. The page render
     * passes false — a third-party call should never hold the first paint —
     * and marks the result `stale` so the client re-reads it once mounted.
     */
    treasury?: boolean;
  } = {},
): Promise<BalanceInfo> {
  const [{ data: isAdmin }, { data: isTeacher }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "teacher" }),
  ]);

  if (isAdmin && options.treasury !== false) {
    // If OpenRouter can't be reached we fall through to the wallet rather than
    // inventing a balance — an admin who has never been granted ore then sees
    // 0, which is the honest answer while the real figure is unknown.
    const ore = await readAdminOreBalance(supabase);
    if (ore !== null) return { balance: ore, unlimited: false, role: "admin" };
  }

  if (isTeacher && !isAdmin) {
    // `balance` is a placeholder that only matters to a client that ignores
    // `unlimited`; 0 rather than a big number so that failure mode is a gated
    // composer, never a balance nobody verified.
    return { balance: 0, unlimited: true, role: "teacher" };
  }

  const { data: credit } = await supabase
    .from("playground_credits")
    .select("balance_ore")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    balance: credit?.balance_ore ?? 20,
    unlimited: false,
    role: isAdmin ? "admin" : "student",
    stale: !!isAdmin && options.treasury === false,
  };
}
