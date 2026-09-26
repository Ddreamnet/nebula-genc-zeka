/** Konu durumunun rozeti (5a): BİTTİ · SIRADA — konunun kendi
 *  `is_completed` alanından gelir. */
export type TopicState = "done" | "next";

const PILL: Record<TopicState, { label: string; className: string }> = {
  done: { label: "Bitti", className: "pn-tag--mint" },
  next: { label: "Sırada", className: "pn-tag--blue" },
};

export function TopicStatusPill({ state }: { state: TopicState }) {
  const pill = PILL[state];
  return <span className={`pn-tag ${pill.className} hidden !border-transparent @[460px]:inline-flex`}>{pill.label}</span>;
}
