"use client";

import { useEffect, useState } from "react";
import { Gem, TriangleAlert, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/panel-ui/card";
import { cn } from "@/lib/cn";

interface Treasury {
  balance: { totalCredits: number; used: number; remainingUsd: number };
  spend: { daily: number; weekly: number; monthly: number };
  granted: { ore: number; wallets: number };
  rate: { usdPerOre: number; isRealized: boolean; sampleSize: number };
  remainingOre: number;
  coverage: number | null;
  reads: { wallets: number; generations: number; error: string | null };
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const ore = (n: number) => Math.round(n).toLocaleString("tr-TR");

/** Coverage below 1 means more ore is promised than the balance can serve. */
function coverageTone(coverage: number | null): string {
  if (coverage === null) return "text-on-surface-variant";
  if (coverage < 1) return "text-error";
  if (coverage < 2) return "text-tertiary";
  return "text-success";
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant/70">{label}</span>
      <span className={cn("font-display text-xl font-semibold tabular-nums", tone ?? "text-on-surface")}>{value}</span>
      {hint && <span className="text-[11px] text-on-surface-variant/70">{hint}</span>}
    </div>
  );
}

export function PlaygroundTreasury() {
  const [data, setData] = useState<Treasury | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Refreshing is a re-run of the same effect rather than a separate code
  // path, so there's exactly one place that fetches and one place that writes
  // state — and nothing sets state synchronously during the effect.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/playground-treasury", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error === "openrouter_unreachable" ? "OpenRouter'a ulaşılamadı" : "Kasa okunamadı");
          setData(null);
        } else {
          setData(await res.json());
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Kasa okunamadı");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  if (loading && !data) {
    return (
      <Card className="mx-auto w-full max-w-6xl">
        <CardContent className="py-4 text-sm text-on-surface-variant">Playground kasası yükleniyor...</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="mx-auto w-full max-w-6xl">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-error">
          <TriangleAlert className="size-4 shrink-0" />
          {error ?? "Kasa okunamadı"}
        </CardContent>
      </Card>
    );
  }

  // A zero read isn't proof of zero data — if RLS filters every row away the
  // sums come back empty and would otherwise render as a confident "0".
  const blindWallets = data.reads.wallets === 0;
  const blindGenerations = data.reads.generations === 0;

  return (
    <Card className="mx-auto w-full max-w-6xl">
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gem className="size-4 text-secondary" />
            <h2 className="font-display text-sm font-semibold">Playground kasası</h2>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            aria-label="Yenile"
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-2.5 py-1 font-mono text-[10px] text-on-surface-variant transition hover:text-on-surface disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            Yenile
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat
            label="Kasada"
            value={usd(data.balance.remainingUsd)}
            hint={`${usd(data.balance.totalCredits)} yüklendi · ${usd(data.balance.used)} harcandı`}
          />
          <Stat
            label="Karşılığı"
            value={`${ore(data.remainingOre)} cevher`}
            hint={`${data.rate.usdPerOre.toFixed(4)} $/cevher${data.rate.isRealized ? ` · son ${data.rate.sampleSize} üretim` : " · varsayılan"}`}
          />
          <Stat
            label="Dağıtılmış"
            value={`${ore(data.granted.ore)} cevher`}
            hint={`${data.granted.wallets} öğrenci cüzdanı`}
          />
          <Stat
            label="Karşılama"
            value={data.coverage === null ? "—" : `${data.coverage.toFixed(2)}×`}
            hint={data.coverage === null ? "dağıtılmış cevher yok" : data.coverage < 1 ? "kasa yetmiyor" : "kasa yetiyor"}
            tone={coverageTone(data.coverage)}
          />
          <Stat
            label="Harcama"
            value={usd(data.spend.daily)}
            hint={`bu ay ${usd(data.spend.monthly)} · bu hafta ${usd(data.spend.weekly)}`}
          />
        </div>

        {(blindWallets || blindGenerations) && (
          <p className="flex items-start gap-2 rounded-lg border border-tertiary/30 bg-tertiary/8 px-3 py-2 text-[11px] leading-relaxed text-on-surface-variant">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-tertiary" />
            <span>
              {blindWallets && blindGenerations
                ? "Ne cüzdan ne üretim kaydı okunabildi"
                : blindWallets
                  ? "Hiç öğrenci cüzdanı okunamadı"
                  : "Hiç üretim kaydı okunamadı"}
              . Gerçekten veri yoksa normal; ama veri olduğunu biliyorsan admin rolünün{" "}
              <code className="font-mono">playground_credits</code> / <code className="font-mono">ai_generations</code> üzerinde
              SELECT politikası eksik demektir — bu durumda yukarıdaki toplamlar olduğundan düşük görünür.
              {data.reads.error && <> Hata: {data.reads.error}</>}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
