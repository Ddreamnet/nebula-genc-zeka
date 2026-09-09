"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SHEET_CLOSED_TRANSFORM, useDragToDismiss } from "@/components/panel-ui/sheet";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavTone } from "./panel-shell";

const BAND: Record<NavTone, string> = {
  blue: "pn-band--blue",
  mint: "pn-band--mint",
  peach: "pn-band--peach",
  violet: "pn-band--violet",
  pink: "pn-band--pink",
};

const LINE: Record<NavTone, string> = {
  blue: "var(--pn-blue-line)",
  mint: "var(--pn-mint-line)",
  peach: "var(--pn-peach-line)",
  violet: "var(--pn-violet-line)",
  pink: "var(--pn-pink-line)",
};

export interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Başlığın yanındaki bağlam satırı — "Elif Yıldız · 12 ödev". */
  subtitle?: string;
  tone?: NavTone;
  /** Başlığın altındaki ikon–sayı çiftleri. */
  meta?: ReactNode;
  /** Panelin altına yapışan tek eylem (ör. "Dosya yükle"). */
  footer?: ReactNode;
  /** Masaüstünde 376px yerine kalan tüm genişliği alır — haftalık program
   *  gibi geniş bir tablo 376px'e sığmaz, sıkıştırılmış hâli okunmaz olur. */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Yan panel.
 *
 * Masaüstünde bir OVERLAY DEĞİL: kendisini çağıran flex satırının ikinci
 * çocuğudur, yani yanındaki kartla yükseklikleri yapısal olarak eşittir ve
 * panel o kartı gerçekten sıkıştırır. Overlay yapılsaydı "yüksekliği onunla
 * aynı olsun" şartı korunamazdı — ayrı ayrı verilen iki yükseklik ilk içerik
 * değişiminde ayrı düşer.
 *
 * Mobilde alttan çıkan bir karta döner (CSS'te, aynı DOM ile). Orada gerçek
 * bir modal olur: arkasında perde, sayfa kaydırması kilitli, Escape kapatır.
 */
export function SideDrawer({ open, onClose, title, subtitle, tone = "peach", meta, footer, wide, children }: SideDrawerProps) {
  /**
   * Stays mounted for one exit animation after `open` flips to false.
   *
   * The phase is derived DURING render (React's "adjust state on prop
   * change" pattern), not from an effect or a timer: an effect fires after
   * the render that already has `open=false`, and if that render returned
   * null the panel would unmount for a frame and then re-mount to play its
   * exit — visibly, as a card that vanishes, pops back up at the top and
   * slides down a second time. Now there is no such frame: the same node
   * goes from "open" straight to "closing".
   */
  const [phase, setPhase] = useState<"open" | "closing" | "closed">(open ? "open" : "closed");
  if (open && phase !== "open") setPhase("open");
  if (!open && phase === "open") setPhase("closing");
  useEffect(() => {
    if (phase !== "closing") return;
    const end = window.setTimeout(() => setPhase("closed"), 260);
    return () => window.clearTimeout(end);
  }, [phase]);

  const panelRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  // Mobilde kart her yerinden — ve üstündeki perdeden — aşağı çekilerek
  // kapanır (useDragToDismiss).
  useDragToDismiss(panelRef, onClose, { open, closedTransform: SHEET_CLOSED_TRANSFORM, scrim: scrimRef });
  // Escape her iki modda da kapatır. Mobilde ayrıca sayfa kaydırması
  // kilitlenir; masaüstünde kilitlenmez — panel orada sayfanın bir parçası,
  // arkasındaki listeyi kaydırmak meşru bir iş.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    const isMobile = window.matchMedia("(max-width: 1023.98px)").matches;
    const previous = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      if (isMobile) document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (phase === "closed") return null;

  return (
    <>
      {/* Perde yalnızca mobilde görünür (lg:hidden). Masaüstünde arkadaki
          içerik hâlâ kullanılabilir olmalı — panel bir kesinti değil, ikinci
          bir kolon. */}
      <div ref={scrimRef} className="pn-drawer-scrim lg:hidden" data-state={open ? "open" : "closed"} onClick={onClose} aria-hidden />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label={title}
        data-state={open ? "open" : "closed"}
        className={cn("pn-drawer pn-enter-right", wide && "lg:w-auto lg:min-w-0 lg:flex-1")}
        style={{ ["--pn-drawer-line" as string]: LINE[tone] }}
      >
        <div className={cn("pn-band pn-drawer-handle items-start", BAND[tone])}>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-[17px] font-semibold leading-tight text-on-surface">{title}</h2>
              {subtitle && <span className="truncate text-[12px] text-on-surface-variant">{subtitle}</span>}
            </div>
            {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
          </div>
          {/* Yalnız masaüstü: telefonda kart aşağı çekilerek kapanır. */}
          <button
            type="button"
            aria-label="Paneli kapat"
            onClick={onClose}
            className="hidden size-8 shrink-0 place-items-center rounded-[10px] border border-[color:var(--pn-hair-strong)] bg-surface-container text-on-surface-variant transition-colors duration-[.18s] hover:bg-surface-low lg:grid"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="pn-scroll flex flex-1 flex-col gap-1.5 p-2.5">{children}</div>

        {footer && <div className="border-t border-[color:var(--pn-hair)] p-3">{footer}</div>}
      </aside>
    </>
  );
}
