"use client";

import { useEffect, useState } from "react";
import { Gem, TriangleAlert, RefreshCw } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTrigger } from "@/components/panel-ui/sheet";
import { cn } from "@/lib/cn";

/**
 * The Playground treasury, behind a button.
 *
 * It used to render as a full-width card pinned above the whole admin panel —
 * five statistics permanently occupying the first screen of a page whose
 * actual job is teachers and students, and one OpenRouter round-trip on every
 * admin page load to fill numbers nobody had asked for. It's a thing you check
 * occasionally, so it's now a header button that opens a dialog, and the fetch
 * only happens when the dialog is open (Radix doesn't mount closed content).
 *
 * Everything is shown in lira first and dollars second: the account is topped
 * up in dollars, but the question being asked is always "bu bize kaça mal
 * oluyor". Nothing is *charged* in lira — the rate is display only.
 */

interface LedgerRow {
  id: string;
  createdAt: string;
  toolId: string;
  toolName: string;
  modality: string;
  status: string;
  ore: number;
  realUsd: number | null;
  user: string | null;
}

interface ToolSpend {
  toolId: string;
  toolName: string;
  modality: string;
  count: number;
  ore: number;
  realUsd: number;
}

interface Treasury {
  balance: { totalCredits: number; used: number; remainingUsd: number };
  spend: { daily: number; weekly: number; monthly: number };
  granted: { ore: number; wallets: number };
  rate: { usdPerOre: number; isRealized: boolean; sampleSize: number };
  remainingOre: number;
  coverage: number | null;
  reads: { wallets: number; generations: number; error: string | null };
  ledger: {
    days: number;
    recent: LedgerRow[];
    byTool: ToolSpend[];
    totals: { count: number; completed: number; failed: number; ore: number; realUsd: number };
    truncated: boolean;
    error: string | null;
  };
  fx: { usdTry: number; source: string; asOf: string } | null;
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const ore = (n: number) => Math.round(n).toLocaleString("tr-TR");
const oreExact = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

const lira = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
/** Lira for a dollar figure, or a dash when no rate came back. */
const tl = (n: number, rate: number | null) => (rate ? lira.format(n * rate) : "—");

const MODALITY_LABEL: Record<string, string> = { text: "Metin", image: "Görsel", video: "Video", audio: "Ses" };
const STATUS_LABEL: Record<string, string> = { completed: "", failed: "iade edildi", pending: "sürüyor", in_progress: "sürüyor" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

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
      <span className="font-mono text-micro uppercase tracking-wider text-on-surface-variant/70">{label}</span>
      <span className={cn("font-display text-xl font-semibold tabular-nums", tone ?? "text-on-surface")}>{value}</span>
      {hint && <span className="text-micro text-on-surface-variant/70">{hint}</span>}
    </div>
  );
}

function SectionTitle({ children, aside }: { children: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-outline-variant/40 pb-1.5">
      <h3 className="font-mono text-micro uppercase tracking-wider text-on-surface-variant/70">{children}</h3>
      {aside && <span className="text-micro tabular-nums text-on-surface-variant/70">{aside}</span>}
    </div>
  );
}

const th = "pb-1.5 text-left font-mono text-micro font-normal uppercase tracking-wider text-on-surface-variant/60";
const thNum = cn(th, "text-right");
const td = "py-1.5 align-top text-sm";
const tdNum = cn(td, "text-right tabular-nums whitespace-nowrap");

function ToolTable({ rows, rate }: { rows: ToolSpend[]; rate: number | null }) {
  const shown = rows.slice(0, 8);
  const rest = rows.slice(8);
  const restUsd = rest.reduce((s, r) => s + r.realUsd, 0);
  const restOre = rest.reduce((s, r) => s + r.ore, 0);
  const restCount = rest.reduce((s, r) => s + r.count, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-outline-variant/30">
            <th className={th}>Araç</th>
            <th className={thNum}>Üretim</th>
            <th className={thNum}>Cevher</th>
            <th className={thNum}>Maliyet</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {shown.map((r) => (
            <tr key={r.toolId}>
              <td className={td}>
                <span className="text-on-surface">{r.toolName}</span>
                <span className="ml-1.5 text-micro text-on-surface-variant/60">{MODALITY_LABEL[r.modality] ?? r.modality}</span>
              </td>
              <td className={tdNum}>{r.count}</td>
              <td className={tdNum}>{oreExact(r.ore)}</td>
              <td className={tdNum}>
                {tl(r.realUsd, rate)}
                <span className="ml-1.5 text-micro text-on-surface-variant/60">{usd(r.realUsd)}</span>
              </td>
            </tr>
          ))}
          {rest.length > 0 && (
            <tr>
              <td className={cn(td, "text-on-surface-variant/70")}>+{rest.length} araç daha</td>
              <td className={cn(tdNum, "text-on-surface-variant/70")}>{restCount}</td>
              <td className={cn(tdNum, "text-on-surface-variant/70")}>{oreExact(restOre)}</td>
              <td className={cn(tdNum, "text-on-surface-variant/70")}>{tl(restUsd, rate)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecentTable({ rows, rate }: { rows: LedgerRow[]; rate: number | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-outline-variant/30">
            <th className={th}>Zaman</th>
            <th className={th}>Kim</th>
            <th className={th}>Araç</th>
            <th className={thNum}>Cevher</th>
            <th className={thNum}>Maliyet</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {rows.map((r) => {
            const failed = r.status === "failed";
            const note = STATUS_LABEL[r.status] ?? r.status;
            return (
              <tr key={r.id} className={cn(failed && "text-on-surface-variant/60")}>
                <td className={cn(td, "whitespace-nowrap tabular-nums")}>{when(r.createdAt)}</td>
                <td className={cn(td, "max-w-[9rem] truncate")}>{r.user ?? "—"}</td>
                <td className={td}>
                  {r.toolName}
                  {note && <span className="ml-1.5 text-micro text-on-surface-variant/60">{note}</span>}
                </td>
                <td className={cn(tdNum, failed && "line-through")}>{oreExact(r.ore)}</td>
                <td className={tdNum}>
                  {r.realUsd === null ? (
                    <span className="text-on-surface-variant/60">—</span>
                  ) : (
                    <>
                      {tl(r.realUsd, rate)}
                      <span className="ml-1.5 text-micro text-on-surface-variant/60">${r.realUsd.toFixed(3)}</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TreasuryBody() {
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
    return <p className="py-2 text-sm text-on-surface-variant">Atölye kasası yükleniyor...</p>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="flex items-center gap-2 text-sm text-error">
          <TriangleAlert className="size-4 shrink-0" />
          {error ?? "Kasa okunamadı"}
        </p>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-outline-variant px-2.5 py-1 font-mono text-micro text-on-surface-variant transition hover:text-on-surface disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
          Tekrar dene
        </button>
      </div>
    );
  }

  const rate = data.fx?.usdTry ?? null;
  const { ledger } = data;
  // A zero read isn't proof of zero data — if RLS filters every row away the
  // sums come back empty and would otherwise render as a confident "0".
  const blindWallets = data.reads.wallets === 0;
  const blindGenerations = data.reads.generations === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <Stat
          label="Kasada"
          value={tl(data.balance.remainingUsd, rate)}
          hint={`${usd(data.balance.remainingUsd)} · ${usd(data.balance.totalCredits)} yüklendi, ${usd(data.balance.used)} harcandı`}
        />
        <Stat
          label="1 cevher"
          value={tl(data.rate.usdPerOre, rate)}
          hint={`$${data.rate.usdPerOre.toFixed(4)}${data.rate.isRealized ? ` · son ${data.rate.sampleSize} üretimin ortalaması` : " · varsayılan, henüz üretim yok"}`}
        />
        <Stat
          label="Bugün harcanan"
          value={tl(data.spend.daily, rate)}
          hint={`bu hafta ${tl(data.spend.weekly, rate)} · bu ay ${tl(data.spend.monthly, rate)}`}
        />
        <Stat label="Karşılığı" value={`${ore(data.remainingOre)} cevher`} hint="senin Atölye bakiyen de bu" />
        <Stat label="Dağıtılmış" value={`${ore(data.granted.ore)} cevher`} hint={`${data.granted.wallets} öğrenci cüzdanı`} />
        <Stat
          label="Karşılama"
          value={data.coverage === null ? "—" : `${data.coverage.toFixed(2)}×`}
          hint={data.coverage === null ? "dağıtılmış cevher yok" : data.coverage < 1 ? "kasa yetmiyor" : "kasa yetiyor"}
          tone={coverageTone(data.coverage)}
        />
      </div>

      <p className="text-micro leading-relaxed text-on-surface-variant/70">
        {data.fx ? (
          <>
            Kur: 1 $ = {lira.format(data.fx.usdTry)} · {data.fx.source}
            {data.fx.asOf && ` ${data.fx.asOf}`}. Cevher dolarla alınıp satılır, lira yalnızca okumak için.
          </>
        ) : (
          <>Kur alınamadı; lira karşılıkları gösterilemiyor, dolar tutarları doğru.</>
        )}
      </p>

      <section className="flex flex-col gap-2">
        <SectionTitle
          aside={`${ledger.totals.completed} üretim · ${oreExact(ledger.totals.ore)} cevher · ${tl(ledger.totals.realUsd, rate)}${ledger.totals.failed ? ` · ${ledger.totals.failed} iade` : ""}`}
        >
          {`Son ${ledger.days} gün, araç bazında`}
        </SectionTitle>
        {ledger.byTool.length === 0 ? (
          <p className="py-1 text-sm text-on-surface-variant">Bu dönemde tamamlanmış üretim yok.</p>
        ) : (
          <ToolTable rows={ledger.byTool} rate={rate} />
        )}
        {ledger.truncated && (
          <p className="text-micro text-on-surface-variant/70">Son 1000 üretim okundu; dönem toplamları bundan yüksek olabilir.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle aside="cevher: alınan · maliyet: OpenRouter'ın kestiği">Son üretimler</SectionTitle>
        {ledger.recent.length === 0 ? (
          <p className="py-1 text-sm text-on-surface-variant">Henüz üretim yok.</p>
        ) : (
          <RecentTable rows={ledger.recent} rate={rate} />
        )}
      </section>

      {(blindWallets || blindGenerations || ledger.error) && (
        <p className="flex items-start gap-2 rounded-lg border border-tertiary/30 bg-tertiary/8 px-3 py-2 text-micro leading-relaxed text-on-surface-variant">
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
            {(data.reads.error ?? ledger.error) && <> Hata: {data.reads.error ?? ledger.error}</>}
          </span>
        </p>
      )}

      <button
        onClick={refresh}
        disabled={loading}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-outline-variant px-2.5 py-1 font-mono text-micro text-on-surface-variant transition hover:text-on-surface disabled:opacity-50"
      >
        <RefreshCw className={cn("size-3", loading && "animate-spin")} />
        Yenile
      </button>
    </div>
  );
}

/**
 * Kasa — kendi düğmesiyle ya da dışarıdan kontrol edilerek açılır.
 *
 * Kontrollü modda düğmesini çizmez: panel navigasyonundaki ikon onu açar ve
 * aynı eylemi açan ikinci bir düğme olmaz. Radix kapalı içeriği mount
 * etmediği için OpenRouter isteği yalnızca diyalog açıldığında yapılır.
 */
export function PlaygroundTreasuryButton({
  open: controlledOpen,
  onOpenChange,
}: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const setOpen = controlled ? (onOpenChange ?? (() => {})) : setUncontrolledOpen;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* asChild so the panel's own button styling is kept and Radix still
          restores focus here when the dialog closes. */}
      {!controlled && (
        <SheetTrigger asChild>
          <button type="button" className="pn-btn pn-btn--sm pn-btn--violet">
            <Gem className="h-4 w-4" />
            <span className="hidden sm:inline">Kasa</span>
          </button>
        </SheetTrigger>
      )}
      <SheetContent size="lg" onDismiss={() => setOpen(false)}>
        <SheetHeader tone="violet" title="Atölye kasası" subtitle="OpenRouter bakiyesi, harcamalar ve cevher dağıtımı" icon={<Gem className="size-5 shrink-0 text-[color:var(--pn-violet-ink)]" strokeWidth={1.9} aria-hidden />} />
        <SheetBody>
          <TreasuryBody />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
