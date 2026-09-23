"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  /** Adın altındaki satır: ders saati, öğrenci sayısı… */
  meta?: ReactNode;
  /** Ortadaki ızgara (paket ya da haftalık yük). */
  grid?: ReactNode;
  /** Sağdaki düğmeler. */
  actions?: ReactNode;
  ariaLabel: string;
  className?: string;
}

/**
 * Seçili öğe kartı (5a §7) — öğretmen, öğrenci ve yönetici panelinde aynı
 * iskelet: TEK mavi kart. Geniş yerde tek satır (sol kimlik · orta ızgara ·
 * sağ düğmeler); dar yerde (4b) kimlik ve düğmeler mavi bantta, ızgara
 * altındaki krem gövdede.
 *
 * Kırılım GENİŞLİK değil KONTEYNER sorgusu: yan panel açıldığında ya da
 * tablette kart daralırsa ekran geniş olsa bile iki katlı düzene geçer.
 * Tek DOM, iki yerleşim — ızgara (ve verisi) iki kez render edilmez.
 */
export function SelectedCard({ title, meta, grid, actions, ariaLabel, className }: Props) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "@container shrink-0 overflow-hidden rounded-[18px] border border-[color:rgba(36,55,166,.22)] bg-[color:var(--pn-blue)] lg:rounded-[20px]",
        className,
      )}
      style={{ boxShadow: "0 1px 2px rgba(36,55,166,.06), 0 10px 24px -16px rgba(36,55,166,.3)" }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center @[860px]:grid-cols-[auto_minmax(0,1fr)_auto] @[860px]:gap-5 @[860px]:px-[18px] @[860px]:py-[14px]">
        <div className="flex min-w-0 flex-col gap-1 py-2.5 pl-3.5 pr-2 @[860px]:max-w-[260px] @[860px]:p-0">
          <h2 className="truncate font-display text-[19px] font-bold leading-tight tracking-[-.025em] text-on-surface @[860px]:text-[24px]">
            {title}
          </h2>
          {meta && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[color:var(--pn-ink-2)] @[860px]:text-[14px]">
              {meta}
            </div>
          )}
        </div>

        {actions && (
          <div className="col-start-2 row-start-1 flex items-center gap-2 py-2.5 pr-3 @[860px]:col-start-3 @[860px]:p-0">
            {actions}
          </div>
        )}

        {grid && (
          <div className="col-span-2 row-start-2 border-t border-[color:rgba(36,55,166,.16)] bg-[color:var(--color-surface-container)] px-3 pb-2 pt-2.5 @[860px]:col-span-1 @[860px]:col-start-2 @[860px]:row-start-1 @[860px]:mx-auto @[860px]:w-full @[860px]:max-w-[420px] @[860px]:border-0 @[860px]:bg-transparent @[860px]:p-0">
            {grid}
          </div>
        )}
      </div>
    </section>
  );
}

/** Kartın sağındaki ikon düğmesi: beyaz kare, 44 (dar) / 50 (geniş). */
export const cardIconButton =
  "grid size-11 shrink-0 place-items-center rounded-[13px] border border-[color:rgba(36,55,166,.16)] bg-white text-[color:var(--pn-blue-ink-strong)] transition-[transform,box-shadow] duration-[.16s] hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(36,55,166,.4)] @[860px]:size-[50px] @[860px]:rounded-[14px]";

/** Kartın sağındaki metinli düğme (Ödevler): şeftali, 44 / 50 yükseklik. */
export const cardPeachButton =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-[13px] border border-[color:rgba(210,112,26,.4)] bg-[color:var(--pn-peach)] px-3.5 text-[14px] font-bold text-[color:var(--pn-peach-ink-strong)] transition-[transform,box-shadow] duration-[.16s] hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(210,112,26,.5)] aria-pressed:translate-y-0 aria-pressed:shadow-[inset_0_2px_5px_rgba(156,74,10,.3)] @[860px]:h-[50px] @[860px]:rounded-[14px] @[860px]:px-5 @[860px]:text-[15px]";
