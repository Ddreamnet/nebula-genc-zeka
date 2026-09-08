"use client";

import { useState } from "react";
import { BookOpen, Check, ChevronDown, ExternalLink } from "lucide-react";
import { getResourceIcon } from "@/lib/admin/resource-icon";
import type { Topic } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

/**
 * Öğrencinin konu listesi — öğretmen panelindeki kartın SALT OKUNUR ikizi.
 *
 * Aynı satır dili, aynı üç ton, aynı ölçekler; tek fark işaret dairesinin
 * bir düğme olmaması. Öğrenci kendi ilerlemesini işaretleyemez, o yüzden
 * daire yalnızca durumu gösterir.
 *
 * Görünürlük kuralı değişmedi: bitmemiş bir konuda yalnızca öğretmenin
 * tamamlanmış işaretlediği kaynaklar görünür — henüz işlenmemiş bir kaynak
 * dersten önce açılmaz.
 */
export function StudentTopicsCard({ topics, loading }: { topics: Topic[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const done = topics.filter((t) => t.is_completed).length;
  const firstOpenIndex = topics.findIndex((t) => !t.is_completed);

  return (
    <section className="pn-card min-h-0 flex-1" aria-label="Öğrendiklerim">
      <div className="pn-band pn-band--blue">
        <div className="flex min-w-0 flex-col">
          <h2 className="pn-card-title">Öğrendiklerim</h2>
          <p className="pn-card-sub">Konular ve kaynaklar</p>
        </div>
        {/* İlerleme çubuğu SABİT 64px ve BAŞLIĞIN HEMEN YANINDA. İki hata
            birden düzeltildi: `flex-1` verildiğinde çubuk geniş bir kartta
            1100px'e uzuyordu (20 konudan 9'unu anlatmak için bandın yarısı),
            ve sağa yaslandığında "9/20" ile ne'yin 9/20'si olduğu bandın iki
            ucuna düşüyordu. Sayı etiketinin yanında durur. */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[color:rgba(21,35,67,.12)]">
            <div
              className="h-full rounded-full bg-[color:var(--pn-mint-ink)] transition-[width] duration-[.26s]"
              style={{ width: topics.length > 0 ? `${Math.round((done / topics.length) * 100)}%` : "0%" }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-[color:var(--pn-mint-ink)]">
            {done}/{topics.length}
          </span>
        </div>
      </div>

      <div className="pn-scroll @container flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        {/* Yalnızca liste henüz BOŞKEN iskelet: bir yeniden okuma sırasında dolu listenin üstünde beliren boş bir blok, konuların bir anlığına aşağı kaymasına yol açıyordu. */}
        {loading && topics.length === 0 && <div className="h-16 animate-pulse rounded-[12px] bg-[color:var(--pn-blue-tint)]" />}

        {!loading && topics.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <BookOpen className="size-8 text-outline" strokeWidth={1.5} aria-hidden />
            <p className="text-[13px] text-on-surface-variant">Henüz bir konu eklenmemiş.</p>
            <p className="max-w-[260px] text-[12px] text-on-surface-variant">
              Öğretmenin keşfetmen için konular ve kaynaklar ekleyecek.
            </p>
          </div>
        )}

        {topics.map((topic, index) => {
          const visible = topic.is_completed ? topic.resources : topic.resources.filter((r) => r.is_completed);
          const state = topic.is_completed ? "done" : index === firstOpenIndex ? "current" : "next";
          const tone =
            state === "done"
              ? "var(--pn-mint-ink)"
              : state === "current"
                ? "var(--pn-peach-ink)"
                : "var(--color-on-surface-variant)";
          const dot =
            state === "done" ? "var(--pn-mint)" : state === "current" ? "var(--pn-peach)" : "var(--pn-blue-tint)";
          const isOpen = expanded.has(topic.id);

          return (
            <div
              key={topic.id}
              className="rounded-[12px] border border-l-[3px]"
              style={{
                background: state === "current" ? "var(--pn-peach-sel)" : "var(--color-surface-container)",
                borderColor: state === "current" ? "var(--pn-peach-line)" : "var(--pn-hair)",
                borderLeftColor: tone,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(topic.id)) next.delete(topic.id);
                    else next.add(topic.id);
                    return next;
                  })
                }
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 p-2 text-left"
              >
                <span
                  aria-hidden
                  className="grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]"
                  style={{ background: dot, borderColor: tone }}
                >
                  <Check
                    className="size-2.5"
                    strokeWidth={3}
                    style={{ color: topic.is_completed ? tone : "rgba(21,35,67,.22)" }}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-on-surface">{topic.title}</span>
                {visible.length > 0 && (
                  <span
                      className="hidden shrink-0 font-mono text-[10px] font-semibold tabular-nums text-outline @[300px]:inline"
                      aria-label={`${visible.length} kaynak`}
                    >
                      {visible.length}
                    </span>
                )}
                <ChevronDown
                  className={cn("size-3.5 shrink-0 text-outline transition-transform duration-[.18s]", isOpen && "rotate-180")}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>

              {/* Always mounted, height-animated (.pn-expand); `inert` keeps a
                  closed list out of the tab order. */}
              <div className="pn-expand" data-open={isOpen} inert={!isOpen}>
                <div>
                <div className="flex flex-col gap-1 border-t border-[color:var(--pn-hair)] p-2">
                  {topic.description && (
                    <p className="px-1.5 pb-1 text-[12px] leading-relaxed text-on-surface-variant">{topic.description}</p>
                  )}
                  {visible.length === 0 ? (
                    <p className="px-1.5 py-2 text-[12px] text-on-surface-variant">
                      Bu konu için henüz açılmış bir kaynak yok.
                    </p>
                  ) : (
                    visible.map((resource) => (
                      // Satırın tamamı TEK bir bağlantı: orta tık, "yeni
                      // sekmede aç" ve ekran okuyucu bunun üzerinde çalışır,
                      // window.open çağıran bir <div> üzerinde çalışmaz.
                      <a
                        key={resource.id}
                        href={resource.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/res flex min-h-11 items-center gap-2 rounded-[10px] bg-[color:var(--pn-blue-tint)] p-1.5 no-underline pointer-fine:min-h-9"
                      >
                        {getResourceIcon(resource.resource_type)}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-on-surface group-hover/res:underline">
                            {resource.title}
                          </span>
                          {resource.description && (
                            <span className="block truncate text-[11px] text-on-surface-variant">{resource.description}</span>
                          )}
                        </span>
                        <ExternalLink className="size-3 shrink-0 text-outline" aria-hidden />
                      </a>
                    ))
                  )}
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
