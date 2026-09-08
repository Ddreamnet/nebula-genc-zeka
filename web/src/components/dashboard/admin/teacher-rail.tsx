"use client";

import { memo, useState } from "react";
import { ChevronDown, Plus, Search, Settings } from "lucide-react";
import type { Teacher } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

/** Mobilde katlanmadan önce gösterilen satır sayısı — öğretmen panelindeki
 *  öğrenci listesiyle aynı sayı, aynı sebeple. */
const MOBILE_VISIBLE = 4;

const Row = memo(function Row({
  teacher,
  selected,
  extra,
  onSelect,
  onEdit,
}: {
  teacher: Teacher;
  selected: boolean;
  extra: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const activeStudents = teacher.students.filter((s) => !s.is_archived).length;
  return (
    <div className="relative" data-extra={extra}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="pn-row pr-10"
        style={{
          ["--pn-row-stripe" as string]: selected ? "var(--pn-violet-ink)" : "transparent",
          ["--pn-row-fill" as string]: selected ? "var(--pn-violet-sel)" : "transparent",
          ["--pn-row-hover" as string]: "var(--pn-violet-tint)",
        }}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-on-surface">{teacher.full_name}</span>
        <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-on-surface-variant">
          {activeStudents}
        </span>
      </button>
      {/* Ayar düğmesi satırın İÇİNDE değil ÜSTÜNDE: iç içe <button> geçersiz
          HTML'dir ve tıklama olayı ikisine birden düşer. Satırın sağ dolgusu
          (pr-10) bu düğmeye ayrılmış yerdir, metin altına girmez. */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${teacher.full_name} ayarları`}
        title="Öğretmen ayarları"
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[8px] text-outline transition-colors duration-[.16s] hover:bg-[color:var(--pn-violet)] hover:text-[color:var(--pn-violet-ink-strong)]"
      >
        <Settings className="size-3.5" strokeWidth={1.9} aria-hidden />
      </button>
    </div>
  );
});

/**
 * Öğretmen listesi kartı — öğretmen panelindeki öğrenci şeridinin admin
 * karşılığı. Aynı 195px, aynı satır dili, aynı katlama davranışı.
 *
 * Renk ailesi mor: admin'in "kimin panelindeyim" sorusu, öğretmenin "sıradaki
 * kim" sorusundan farklı bir sorudur ve farklı bir renkte cevaplanır. Panelde
 * rengin tek işi hangi soruya bakıldığını söylemek.
 */
export function TeacherRail({
  teachers,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
}: {
  teachers: Teacher[];
  selectedId: string | null;
  onSelect: (teacher: Teacher) => void;
  onCreate: () => void;
  onEdit: (teacher: Teacher) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const visible = needle
    ? teachers.filter((t) => t.full_name.toLocaleLowerCase("tr-TR").includes(needle))
    : teachers;
  const isExtra = (index: number) => !needle && index >= MOBILE_VISIBLE;

  return (
    <section className="pn-card min-h-0" aria-label="Öğretmenler">
      <div className="pn-band pn-band--violet relative gap-2">
        <h2 className="pn-card-title whitespace-nowrap">Öğretmenler</h2>
        <span className="pn-chip pn-chip--violet">{teachers.length}</span>
        <span className="flex-1" />
        <input
          type="search"
          className="pn-search"
          placeholder="Ara"
          aria-label="Öğretmen ara"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Search className="pn-search-icon size-3.5 text-[color:var(--pn-violet-ink)]" strokeWidth={2} aria-hidden />
      </div>

      <div className="pn-rail-list pn-scroll flex min-h-0 flex-1 flex-col gap-0.5 p-2" data-show-all={showAll}>
        {visible.length === 0 && (
          <p className="px-2 py-6 text-center text-[12px] text-on-surface-variant">
            {needle ? "Eşleşen öğretmen yok." : "Henüz öğretmen yok."}
          </p>
        )}
        {visible.map((teacher, index) => (
          <Row
            key={teacher.user_id}
            teacher={teacher}
            extra={isExtra(index)}
            selected={teacher.user_id === selectedId}
            onSelect={() => onSelect(teacher)}
            onEdit={() => onEdit(teacher)}
          />
        ))}
      </div>

      {visible.length > MOBILE_VISIBLE && !needle && (
        <div className="pn-rail-more px-2 pb-2">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={showAll}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[color:var(--pn-violet-line)] bg-[color:var(--pn-violet-tint)] text-[13px] font-semibold text-[color:var(--pn-violet-ink)]"
          >
            {showAll ? "Daha az göster" : "Tümünü gör"}
            <span className="font-mono text-[10px] font-semibold tabular-nums text-on-surface-variant">{visible.length}</span>
            <ChevronDown className={cn("size-3.5 transition-transform duration-[.18s]", showAll && "rotate-180")} aria-hidden />
          </button>
        </div>
      )}

      <div className="border-t border-[color:var(--pn-hair)] p-2">
        <button type="button" onClick={onCreate} className="pn-btn pn-btn--violet pn-btn--sm w-full">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Öğretmen ekle
        </button>
      </div>
    </section>
  );
}
