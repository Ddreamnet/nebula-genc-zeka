import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only snapshot of "can the OpenRouter balance actually cover the ore
 * we've handed out?".
 *
 * This has to be a server route rather than a direct Supabase call from the
 * admin components (which is how the rest of the panel works) purely because
 * OPENROUTER_API_KEY can never reach the browser.
 */

/** Realized rate is computed over the most recent generations, not all-time —
 *  it should reflect what a cevher costs *now*, and it keeps the query under
 *  PostgREST's default row ceiling. */
const RATE_SAMPLE = 500;

/** Fallback $/cevher when there's no billing history to derive a rate from —
 *  the catalog's original calibration (1 image ≈ 1 cevher ≈ $0.04). */
const NOMINAL_ORE_USD = 0.04;

interface OpenRouterKey {
  data?: { usage?: number; usage_daily?: number; usage_weekly?: number; usage_monthly?: number };
}
interface OpenRouterCredits {
  data?: { total_credits?: number; total_usage?: number };
}

async function openRouter<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://openrouter.ai/api/v1${path}`, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

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

  const [key, credits, grants, recent] = await Promise.all([
    openRouter<OpenRouterKey>("/key"),
    openRouter<OpenRouterCredits>("/credits"),
    supabase.from("playground_credits").select("balance_ore"),
    supabase
      .from("ai_generations")
      .select("real_cost_usd, ore_charged")
      .eq("status", "completed")
      .not("real_cost_usd", "is", null)
      .order("created_at", { ascending: false })
      .limit(RATE_SAMPLE),
  ]);

  if (!key?.data || !credits?.data) {
    return NextResponse.json({ error: "openrouter_unreachable" }, { status: 502 });
  }

  /**
   * `/credits.total_usage` lags behind reality by minutes-to-hours (measured:
   * a confirmed $0.05 charge left it completely unchanged while the key
   * endpoint had already moved). `total_credits` doesn't lag — it only changes
   * when someone tops up. So the accurate remaining balance is the *cross* of
   * the two endpoints, and neither one alone gives the right answer.
   */
  const totalCredits = credits.data.total_credits ?? 0;
  const used = key.data.usage ?? 0;
  const remainingUsd = totalCredits - used;

  const grantedOre = (grants.data ?? []).reduce((sum, row) => sum + (row.balance_ore ?? 0), 0);

  const sample = recent.data ?? [];
  const sampledUsd = sample.reduce((sum, row) => sum + (row.real_cost_usd ?? 0), 0);
  const sampledOre = sample.reduce((sum, row) => sum + (row.ore_charged ?? 0), 0);
  /**
   * What a cevher has actually been costing, derived from our own billing
   * rows rather than assumed. This matters because the nominal $0.04 was
   * calibrated on image generation; text messages charge 0.05 cevher for up
   * to ~$0.009 of real cost, so a hardcoded rate overstates the treasury.
   */
  const realizedRate = sampledOre > 0 ? sampledUsd / sampledOre : null;
  const rate = realizedRate ?? NOMINAL_ORE_USD;

  const remainingOre = remainingUsd / rate;
  // How much of the ore already sitting in student wallets the balance can
  // actually honour. Below 1 means we've promised more than we can serve.
  const coverage = grantedOre > 0 ? remainingOre / grantedOre : null;

  return NextResponse.json({
    balance: { totalCredits, used, remainingUsd },
    spend: {
      daily: key.data.usage_daily ?? 0,
      weekly: key.data.usage_weekly ?? 0,
      monthly: key.data.usage_monthly ?? 0,
    },
    granted: { ore: grantedOre, wallets: grants.data?.length ?? 0 },
    rate: { usdPerOre: rate, isRealized: realizedRate !== null, sampleSize: sample.length },
    remainingOre,
    coverage,
    // Surfaced so the UI can tell "genuinely no data yet" apart from "RLS is
    // silently filtering every row away", which otherwise both read as 0.
    reads: { wallets: grants.data?.length ?? 0, generations: sample.length, error: grants.error?.message ?? recent.error?.message ?? null },
  });
}
