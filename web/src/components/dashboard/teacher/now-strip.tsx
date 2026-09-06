"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, UserRound } from "lucide-react";
import { getRemainingRights } from "@/lib/lesson/service";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { activeSlot, nextSlot, type SlotRef } from "@/lib/lesson/next-lesson";
import { LessonChain } from "./lesson-chain";
import { cn } from "@/lib/cn";

interface Props {
  studentId: string;
  studentName: string;
  teacherId: string;
  slots: SlotRef[];
  /** Panel açıkken düğme basılı görünür — paneli neyin açtığı okunur kalır. */
  homeworkOpen: boolean;
  onToggleHomework: () => void;
  onOpenAbout: () => void;
  now: Date;
}

/**
 * Seçili öğrencinin başlık şeridi: kim, ne zaman, kaç hak kaldı, ne yapılacak.
 *
 * Şeridin rengi (açık mavi) kartlardan farklıdır ve bilinçlidir: burası bir
 * kart değil, altındaki iki kartın KİME ait olduğunu söyleyen bir başlık.
 * Aynı kremi taşısaydı üç eşdeğer kart görünürdü.
 *
 * "24 dk kaldı" ve ilerleme oranı SAATTEN türetilir, ayrı bir alanda
 * tutulmaz — tutulsaydı iki kaynak ilk dakikada birbirinden ayrı düşerdi.
 */
export function NowStrip({
  studentId,
  studentName,
  teacherId,
  slots,
  homeworkOpen,
  onToggleHomework,
  onOpenAbout,
  now,
}: Props) {
  const [rights, setRights] = useState<{ remaining: number; total: number; cycle: number } | null>(null);

  const loadRights = useCallback(async () => {
    if (!studentId || !teacherId) return;
    const result = await getRemainingRights(studentId, teacherId);
    setRights({ remaining: result.remaining, total: result.total, cycle: result.cycle });
  }, [studentId, teacherId]);

  useEffect(() => {
    loadRights();
  }, [loadRights]);

  const live = activeSlot(slots, now);
  const upcoming = nextSlot(slots, now);
  const slot = live?.slot ?? upcoming?.slot ?? null;

  return (
    <section
      className="flex flex-col gap-2.5 rounded-[16px] border border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue)] p-3.5 sm:p-4"
      style={{ boxShadow: "0 1px 2px rgba(36,55,166,.06), 0 8px 20px -12px rgba(36,55,166,.24)" }}
      aria-label={`${studentName} — ders durumu`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[18px] font-semibold leading-tight text-on-surface">{studentName}</h2>
            {live ? (
              <span className="pn-tag pn-tag--mint">
                <span aria-hidden className="pn-pulse size-1.5 rounded-full bg-[color:var(--pn-mint-ink)]" />
                Derste · {live.minutesLeft} dk
              </span>
            ) : (
              slot && (
                <span className="pn-tag pn-tag--quiet">
                  {getDayName(slot.dayOfWeek)} {formatTime(slot.startTime)}
                </span>
              )
            )}
          </div>
          <p className="truncate text-[12px] text-[color:var(--pn-blue-ink-strong)]">
            {slot
              ? `${getDayName(slot.dayOfWeek)} ${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`
              : "Haftalık ders saati tanımlı değil"}
            {rights ? ` · paket ${rights.cycle} · ${rights.remaining}/${rights.total} hak kaldı` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAbout}
            aria-label={`${studentName} hakkında`}
            title={`${studentName} hakkında`}
            className="pn-btn pn-btn--icon pn-btn--paper"
          >
            <UserRound className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggleHomework}
            aria-pressed={homeworkOpen}
            className={cn("pn-btn pn-btn--sm pn-btn--peach")}
            // Basılı durum: panel açıkken gölge içe döner. Ayrı bir renk
            // vermek yerine aynı butonun ışığını tersine çevirmek, "bu düğme
            // hâlâ aynı düğme, sadece açık" demenin en ucuz yolu.
            style={homeworkOpen ? { boxShadow: "inset 0 1px 3px rgba(156,74,10,.24)", transform: "none" } : undefined}
          >
            <FileText className="size-4" strokeWidth={1.9} aria-hidden />
            Ödevler
          </button>
        </div>
      </div>

      {/* İlerleme çubuğu: canlı derste dolan, boşta gizlenen tek çizgi. */}
      {live && (
        <div className="flex items-center gap-2.5">
          <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[color:rgba(21,35,67,.14)]">
            <div
              className="h-full rounded-full bg-[color:var(--pn-blue-ink)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${Math.round(live.progress * 100)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-[color:var(--pn-blue-ink)]">
            {live.minutesLeft} dk kaldı
          </span>
        </div>
      )}

      <LessonChain
        key={studentId}
        studentId={studentId}
        studentName={studentName}
        teacherId={teacherId}
        activeRange={live ? { start: live.slot.startTime.slice(0, 5), end: live.slot.endTime.slice(0, 5) } : null}
        onChanged={loadRights}
      />
    </section>
  );
}
