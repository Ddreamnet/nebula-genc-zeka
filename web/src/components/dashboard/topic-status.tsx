/** Konu durumunun rozeti (5a): BİTTİ · ŞU AN · SIRADA. Durum konunun kendi
 *  `is_completed` alanından ve ilk bitmemiş konu olup olmamasından gelir. */
export type TopicState = "done" | "current" | "next";

const PILL: Record<TopicState, { label: string; className: string }> = {
  done: { label: "Bitti", className: "pn-tag--mint" },
  current: { label: "Şu an", className: "pn-tag--peach" },
  next: { label: "Sırada", className: "pn-tag--blue" },
};

export function TopicStatusPill({ state }: { state: TopicState }) {
  const pill = PILL[state];
  return <span className={`pn-tag ${pill.className} hidden !border-transparent @[460px]:inline-flex`}>{pill.label}</span>;
}

/** Konular bandındaki ilerleme: esneyen 6px çubuk + "2/6". */
export function TopicsProgress({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  return (
    <div className="flex min-w-[64px] flex-1 items-center gap-2.5">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:rgba(21,35,67,.12)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Tamamlanan konular"
      >
        <div
          className="h-full rounded-full bg-[color:var(--pn-mint-ink)] transition-[width] duration-[.26s]"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[color:var(--pn-pink-ink-strong)]">
        {done}/{total}
      </span>
    </div>
  );
}
