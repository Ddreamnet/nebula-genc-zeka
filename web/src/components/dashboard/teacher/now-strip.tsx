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
 *
 * Şerit bir kez daha sıkıştırıldı. Kaldırılan üç şey, üçü de aynı sebeple:
 * ekranda ikinci kez söylendikleri için.
 *   · "Salı 17:00 – 18:25" — hemen altındaki zincir zaten her dersin kendi
 *     gününü ve saatini satır satır yazıyor.
 *   · Ayrı ilerleme çubuğu satırı — dolgusu artık canlı dersin satırının
 *     alt kenarında, kendi yüksekliği olmadan.
 *   · "24 dk kaldı" — rozette zaten "Derste · 24 dk" yazıyor.
 * Kalan meta satırı yalnızca zincirin söylemediğini söyler: paket ve hak.
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
      className="flex flex-col gap-2 rounded-[16px] border border-[color:var(--pn-blue-line)] bg-[color:var(--pn-blue)] p-3"
      style={{ boxShadow: "0 1px 2px rgba(36,55,166,.06), 0 8px 20px -12px rgba(36,55,166,.24)" }}
      aria-label={`${studentName} — ders durumu`}
    >
      {/* items-start: mobilde başlık bloğu üç satıra sarıyor (ad · rozet ·
          künye) ve `items-center` düğmeleri o üç satırın ortasına, yani
          rozetin hizasına indiriyordu. Düğmeler adın hizasında durmalı —
          eylemin sahibi ad. */}
      <div className="flex flex-wrap items-start gap-2.5">
        <div className="flex min-w-[180px] flex-1 flex-col gap-1">
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
          {/* Kırpılmaz, sarar: bu satır paket ve kalan hak bilgisini taşıyor
              ve dar bir ekranda kırpılırsa öğretmen kaç hakkı kaldığını
              göremez — üç nokta bir bilgi değil, bilginin yokluğudur.
              Mono ve versal, çünkü bu bir cümle değil bir künye: barın alt
              satırıyla aynı dil. */}
          <p className="font-mono text-[10px] font-semibold uppercase leading-tight tracking-[.1em] text-[color:var(--pn-blue-ink-strong)]">
            {rights ? `Paket ${rights.cycle} · ${rights.remaining}/${rights.total} ders hakkı` : "Paket bilgisi yükleniyor"}
            {!slot && " · saat tanımsız"}
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

      <LessonChain
        key={studentId}
        studentId={studentId}
        studentName={studentName}
        teacherId={teacherId}
        activeRange={live ? { start: live.slot.startTime.slice(0, 5), end: live.slot.endTime.slice(0, 5) } : null}
        activeProgress={live?.progress ?? 0}
        onChanged={loadRights}
      />
    </section>
  );
}
