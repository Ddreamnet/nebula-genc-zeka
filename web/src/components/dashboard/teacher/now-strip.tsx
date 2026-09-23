"use client";

import { FileText, UserRound } from "lucide-react";
import { getDayName, formatTime } from "@/lib/lesson/format";
import { activeSlot, nextSlot, type SlotRef } from "@/lib/lesson/next-lesson";
import { PackageGrid } from "../package-grid";
import { SelectedCard, cardIconButton, cardPeachButton } from "../selected-card";

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

/** Aynı günün arka arkaya dersleri tek aralık: "Pazartesi 17:00 — 18:20". */
function dayRange(slots: SlotRef[], day: number): string {
  const sameDay = slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (sameDay.length === 0) return "";
  return `${getDayName(day)} ${formatTime(sameDay[0].startTime)} — ${formatTime(sameDay[sameDay.length - 1].endTime)}`;
}

/**
 * Seçili öğrenci (5a): kim, hangi gün, paketi nerede, ne yapılacak — tek
 * kartta. Önceki sürümün ayrı ders zinciri ve "Paket 2 · 3/8 hak" satırı
 * kalktı: ızgara işlenen ve kalan dersi zaten sayıyor.
 */
export function NowStrip({ studentId, studentName, teacherId, slots, homeworkOpen, onToggleHomework, onOpenAbout, now }: Props) {
  const live = activeSlot(slots, now);
  const upcoming = nextSlot(slots, now);
  const slot = live?.slot ?? upcoming?.slot ?? null;

  return (
    <SelectedCard
      ariaLabel={`${studentName} — ders durumu`}
      title={studentName}
      meta={
        <>
          <span>{slot ? dayRange(slots, slot.dayOfWeek) : "Ders saati tanımsız"}</span>
          {live && (
            <span className="pn-tag pn-tag--peach">
              <span aria-hidden className="pn-pulse size-1.5 rounded-full bg-[color:var(--pn-peach-ink)]" />
              Derste · {live.minutesLeft} dk
            </span>
          )}
        </>
      }
      grid={<PackageGrid key={studentId} studentId={studentId} teacherId={teacherId} studentName={studentName} now={now} editable />}
      actions={
        <>
          <button
            type="button"
            onClick={onOpenAbout}
            aria-label={`${studentName} hakkında`}
            title="Öğrenci hakkında"
            className={cardIconButton}
          >
            <UserRound className="size-5" strokeWidth={1.8} aria-hidden />
          </button>
          <button type="button" onClick={onToggleHomework} aria-pressed={homeworkOpen} className={cardPeachButton}>
            <FileText className="size-[18px]" strokeWidth={1.9} aria-hidden />
            Ödevler
          </button>
        </>
      }
    />
  );
}
