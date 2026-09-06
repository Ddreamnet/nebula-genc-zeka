"use client";

import { memo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface RailRow {
  key: string;
  name: string;
  /** "ŞİMDİ" · "17:00" · "Sal 17:00" — sağdaki mono etiket. */
  when: string;
  /** Bugün ders var mı: listeyi iki bloğa ayıran tek koşul. */
  isToday: boolean;
  /** Şu anda derste — nokta nabız atar, satır nane zemine oturur. */
  isActive: boolean;
  /** Okunmamış ÖĞRENCİ YÜKLEMESİ sayısı (teslim/bekliyor durumu değil). */
  unread: number;
}

/**
 * Bir öğrenci satırı.
 *
 * Kolon ritmi: nokta (6) → isim (esner) → okunmamış sayaç (16) → saat (mono).
 * Sayaç sıfırken de DÜĞÜM KALIR, yalnızca opaklığı 0 olur — düğümü tamamen
 * kaldırmak saatin sağa kaymasına ve satırdan satıra hizanın bozulmasına yol
 * açar. Bir listede gözün takip ettiği tek şey o dikey hizadır.
 *
 * memo: 20 satırlık bir listede arama kutusuna her harf girildiğinde
 * değişmeyen satırlar yeniden render edilmez.
 */
const Row = memo(function Row({
  row,
  selected,
  extra,
  onSelect,
}: {
  row: RailRow;
  selected: boolean;
  extra: boolean;
  onSelect: () => void;
}) {
  const tone = row.isToday ? "var(--pn-mint-ink)" : "var(--pn-violet-ink)";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      data-extra={extra}
      className="pn-row"
      style={{
        ["--pn-row-stripe" as string]: selected ? tone : "transparent",
        ["--pn-row-fill" as string]: selected
          ? row.isToday
            ? "var(--pn-mint-sel)"
            : "var(--pn-violet-sel)"
          : "transparent",
        ["--pn-row-hover" as string]: row.isToday ? "var(--pn-mint-tint)" : "var(--pn-violet-tint)",
      }}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", row.isActive && "pn-pulse")}
        style={{ background: tone }}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-on-surface">{row.name}</span>
      <span
        aria-hidden={row.unread === 0}
        className={cn(
          "grid h-4 min-w-4 shrink-0 place-items-center rounded-full border-[1.5px] px-1 font-mono text-[9px] font-semibold leading-none",
          row.unread > 0
            ? "border-[color:var(--pn-pink-ink)] bg-[color:var(--pn-pink)] text-[color:var(--pn-pink-ink-strong)] opacity-100"
            : "border-transparent opacity-0",
        )}
      >
        {row.unread > 0 ? (row.unread > 9 ? "9+" : row.unread) : "0"}
      </span>
      <span
        className="shrink-0 whitespace-nowrap font-mono text-[10px] font-semibold tabular-nums"
        style={{ color: row.isToday ? tone : "var(--color-on-surface-variant)" }}
      >
        {row.when}
      </span>
    </button>
  );
});

export interface StudentRailProps {
  rows: RailRow[];
  total: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
}

/** Mobilde katlanmadan önce gösterilen satır sayısı. Dört, çünkü altındaki
 *  seçili-öğrenci bloğunun 390×844'lük bir ekranda kıvrımın üstünde
 *  başlaması için kalan yer tam bu kadar. */
const MOBILE_VISIBLE = 4;

/**
 * Öğrenci listesi kartı (masaüstünde 195px sabit).
 *
 * Sıralama sonraki derse göre ve liste iki bloğa ayrılır: BUGÜN ve BU HAFTA.
 * Öğretmenin günün ilk sorusu "sıradaki kim" — liste doğrudan bunu cevaplar,
 * alfabetik bir sıra cevaplamazdı.
 *
 * Masaüstünde liste kendi içinde kayar. Mobilde KAYMAZ: dört satır gösterir,
 * gerisi "Tümünü gör" düğmesinin ardında ve açılınca sayfa uzar. Kayan bir
 * sayfanın içine kayan bir kutu koymak, iOS'ta parmağın hangisini kaydırdığı
 * belirsiz kalan tek düzen hatasıdır.
 */
export function StudentRail({ rows, total, selectedKey, onSelect, query, onQueryChange }: StudentRailProps) {
  const [showAll, setShowAll] = useState(false);

  const today = rows.filter((r) => r.isToday);
  const week = rows.filter((r) => !r.isToday);
  const searching = query.trim().length > 0;
  // Arama sırasında katlama yok: kullanıcı zaten filtreledi, sonucu gizlemek
  // aramanın kendisini yalanlar.
  const isExtra = (index: number) => !searching && index >= MOBILE_VISIBLE;

  return (
    <section className="pn-card min-h-0" aria-label="Öğrencilerim">
      <div className="pn-band pn-band--mint relative gap-2 px-3 py-2.5">
        <h2 className="pn-card-title whitespace-nowrap">Öğrencilerim</h2>
        <span className="pn-chip pn-chip--mint">{total}</span>
        <span className="flex-1" />
        {/* Alanın kendisi ikon: kapalıyken 36px kare, odaklanınca bandın
            tamamına yayılır. Dolgusu opak olduğu için yazarken başlığı ve
            sayacı örter — üstlerinde okunaksız bir katman oluşmaz. */}
        <input
          type="search"
          className="pn-search bg-[color:var(--pn-mint-tint)] focus:bg-surface-container"
          placeholder="Ara"
          aria-label="Öğrenci ara"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <Search className="pn-search-icon size-3.5 text-[color:var(--pn-mint-ink)]" strokeWidth={2} aria-hidden />
      </div>

      <div className="pn-rail-list pn-scroll flex min-h-0 flex-1 flex-col gap-0.5 p-2" data-show-all={showAll}>
        {rows.length === 0 && (
          <p className="px-2 py-6 text-center text-[12px] text-on-surface-variant">
            {searching ? "Eşleşen öğrenci yok." : "Henüz öğrenci yok."}
          </p>
        )}

        {today.length > 0 && (
          <p className="pn-divider" style={{ ["--pn-divider-ink" as string]: "var(--pn-mint-ink)" }}>
            Bugün
          </p>
        )}
        {today.map((row, index) => (
          <Row
            key={row.key}
            row={row}
            extra={isExtra(index)}
            selected={row.key === selectedKey}
            onSelect={() => onSelect(row.key)}
          />
        ))}

        {week.length > 0 && (
          <p
            className={cn("pn-divider", today.length > 0 && "mt-1.5", isExtra(today.length) && "pn-rail-extra-label")}
            data-extra={isExtra(today.length)}
            style={{ ["--pn-divider-ink" as string]: "var(--pn-violet-ink)" }}
          >
            Bu hafta
          </p>
        )}
        {week.map((row, index) => (
          <Row
            key={row.key}
            row={row}
            extra={isExtra(today.length + index)}
            selected={row.key === selectedKey}
            onSelect={() => onSelect(row.key)}
          />
        ))}
      </div>

      {rows.length > MOBILE_VISIBLE && !searching && (
        <div className="pn-rail-more p-2 pt-0">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={showAll}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue-tint)] text-[13px] font-semibold text-[color:var(--pn-blue-ink)]"
          >
            {showAll ? "Daha az göster" : "Tümünü gör"}
            <span className="font-mono text-[10px] font-semibold tabular-nums text-on-surface-variant">{rows.length}</span>
            <ChevronDown className={cn("size-3.5 transition-transform duration-[.18s]", showAll && "rotate-180")} aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
