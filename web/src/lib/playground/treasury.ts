import type { SupabaseClient } from "@supabase/supabase-js";
import { findTool } from "@/lib/playground/tools";

/**
 * The Playground treasury: what the OpenRouter balance is worth in cevher, and
 * how much of it students already hold.
 *
 * Lives here rather than inside the admin route because two callers need the
 * same numbers and must not disagree: the admin panel's treasury card, and the
 * admin's own Playground balance — an admin doesn't get a wallet, they spend
 * the OpenRouter balance directly, so "kasada ne kadar var" and "kaç cevherim
 * var" have to be the same computation.
 *
 * Server-only: OPENROUTER_API_KEY can never reach the browser.
 */

/** Realized rate is computed over the most recent generations, not all-time —
 *  it should reflect what a cevher costs *now*, and it keeps the query under
 *  PostgREST's default row ceiling. */
const RATE_SAMPLE = 500;

/** Fallback $/cevher when there's no billing history to derive a rate from —
 *  the catalog's original calibration (1 image ≈ 1 cevher ≈ $0.04). */
export const NOMINAL_ORE_USD = 0.04;

interface OpenRouterKey {
  data?: { usage?: number; usage_daily?: number; usage_weekly?: number; usage_monthly?: number };
}
interface OpenRouterCredits {
  data?: { total_credits?: number; total_usage?: number };
}

export interface Treasury {
  balance: { totalCredits: number; used: number; remainingUsd: number };
  spend: { daily: number; weekly: number; monthly: number };
  granted: { ore: number; wallets: number };
  rate: { usdPerOre: number; isRealized: boolean; sampleSize: number };
  /** The balance expressed in cevher — an admin's Playground balance, exactly. */
  remainingOre: number;
  coverage: number | null;
  reads: { wallets: number; generations: number; error: string | null };
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

/** Null when OpenRouter can't be reached — the caller decides what that means. */
export async function readTreasury(supabase: SupabaseClient): Promise<Treasury | null> {
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

  if (!key?.data || !credits?.data) return null;

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

  return {
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
    reads: {
      wallets: grants.data?.length ?? 0,
      generations: sample.length,
      error: grants.error?.message ?? recent.error?.message ?? null,
    },
  };
}

/**
 * An admin's Playground balance: the OpenRouter balance in cevher, floored so
 * the number never promises a generation the balance can't actually pay for.
 * Null when OpenRouter is unreachable — the caller falls back rather than
 * inventing a balance.
 */
export async function readAdminOreBalance(supabase: SupabaseClient): Promise<number | null> {
  const treasury = await readTreasury(supabase);
  if (!treasury) return null;
  return Math.max(0, Math.floor(treasury.remainingOre));
}

/* ------------------------------------------------------------------ */
/* Ledger — what was actually spent, generation by generation          */
/* ------------------------------------------------------------------ */

export interface LedgerRow {
  id: string;
  createdAt: string;
  toolId: string;
  toolName: string;
  modality: string;
  status: string;
  /** Cevher taken from the wallet (or, for an admin, from the treasury). */
  ore: number;
  /** What OpenRouter actually billed. Null until the job settles, and for failures. */
  realUsd: number | null;
  user: string | null;
}

export interface ToolSpend {
  toolId: string;
  toolName: string;
  modality: string;
  count: number;
  ore: number;
  realUsd: number;
}

export interface Ledger {
  days: number;
  recent: LedgerRow[];
  /** Completed generations only, most expensive tool first. */
  byTool: ToolSpend[];
  totals: { count: number; completed: number; failed: number; ore: number; realUsd: number };
  /** The window hit the row ceiling, so every total above is a floor, not the truth. */
  truncated: boolean;
  error: string | null;
}

const LEDGER_WINDOW_DAYS = 30;
/** PostgREST's default ceiling; one page is plenty for a two-student school and
 *  keeps the admin dialog from pulling the whole table one day. */
const LEDGER_ROW_CEILING = 1000;
const LEDGER_RECENT = 25;

/**
 * The last month of generations, as the treasury sees them: who ran what,
 * what it took in cevher and what it really cost. Read only by the admin
 * route — the balance route calls readTreasury alone, and this query has no
 * business running after every single generation.
 *
 * Failed rows are refunded by rpc_finalize_generation, so they count as
 * failures but never as spend; pending rows have no cost yet.
 */
export async function readLedger(supabase: SupabaseClient): Promise<Ledger> {
  const since = new Date(Date.now() - LEDGER_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("id, created_at, tool_id, modality, status, ore_charged, real_cost_usd, user_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LEDGER_ROW_CEILING);
  const rows = data ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string).filter(Boolean))];
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    for (const p of profiles ?? []) names.set(p.user_id, p.full_name);
  }
  const toolName = (toolId: string) => findTool(toolId)?.tool.name ?? toolId;

  const totals = { count: rows.length, completed: 0, failed: 0, ore: 0, realUsd: 0 };
  const byTool = new Map<string, ToolSpend>();
  for (const r of rows) {
    if (r.status === "failed") {
      totals.failed += 1;
      continue;
    }
    if (r.status !== "completed") continue;
    const ore = Number(r.ore_charged ?? 0);
    const usd = Number(r.real_cost_usd ?? 0);
    totals.completed += 1;
    totals.ore += ore;
    totals.realUsd += usd;
    const t = byTool.get(r.tool_id) ?? { toolId: r.tool_id, toolName: toolName(r.tool_id), modality: r.modality, count: 0, ore: 0, realUsd: 0 };
    t.count += 1;
    t.ore += ore;
    t.realUsd += usd;
    byTool.set(r.tool_id, t);
  }

  return {
    days: LEDGER_WINDOW_DAYS,
    recent: rows.slice(0, LEDGER_RECENT).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      toolId: r.tool_id,
      toolName: toolName(r.tool_id),
      modality: r.modality,
      status: r.status,
      ore: Number(r.ore_charged ?? 0),
      realUsd: r.real_cost_usd === null || r.real_cost_usd === undefined ? null : Number(r.real_cost_usd),
      user: names.get(r.user_id) ?? null,
    })),
    byTool: [...byTool.values()].sort((a, b) => b.realUsd - a.realUsd),
    totals,
    truncated: rows.length >= LEDGER_ROW_CEILING,
    error: error?.message ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Exchange rate — so the numbers above can be read in lira            */
/* ------------------------------------------------------------------ */

export interface FxRate {
  usdTry: number;
  source: "TCMB" | "open.er-api";
  /** The day the rate is for, as the source prints it. */
  asOf: string;
}

/**
 * Dollars to lira, for display only — nothing is charged in lira.
 *
 * TCMB's daily bulletin first (the official rate an accountant would use;
 * its forex selling rate is what buying dollars actually costs), a public
 * ECB-style feed as a fallback, null when neither answers so the UI can say
 * "kur alınamadı" instead of pretending. Both are cached for an hour by
 * Next's fetch cache: the bulletin changes once a day.
 */
export async function readUsdTry(): Promise<FxRate | null> {
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; nebula-atolye-kasa)" },
    });
    if (res.ok) {
      const xml = await res.text();
      const block = xml.match(/<Currency[^>]*CurrencyCode="USD"[\s\S]*?<\/Currency>/)?.[0] ?? "";
      const selling = Number(block.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/)?.[1]);
      const asOf = xml.match(/Tarih="([^"]+)"/)?.[1];
      if (Number.isFinite(selling) && selling > 0) return { usdTry: selling, source: "TCMB", asOf: asOf ?? "" };
    }
  } catch {
    // Fall through to the second source.
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    if (res.ok) {
      const body = (await res.json()) as { rates?: { TRY?: number }; time_last_update_utc?: string };
      const rate = Number(body.rates?.TRY);
      if (Number.isFinite(rate) && rate > 0) return { usdTry: rate, source: "open.er-api", asOf: body.time_last_update_utc ?? "" };
    }
  } catch {
    // Neither source answered; the caller shows the dollar figures alone.
  }
  return null;
}
