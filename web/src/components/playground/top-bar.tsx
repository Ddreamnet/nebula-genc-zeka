"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { History, LayoutGrid, LogOut, Plus, Gem } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

function formatOre(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
      .join("") || "NG"
  );
}

/**
 * The Playground's bar — the same navy strip the panels wear, with the same
 * 34px control boxes. Left: brand (a link back to the panel), the open chat's
 * title and a mono context line. Right: new chat, history, cevher, avatar.
 */
export function TopBar({
  title,
  subline,
  name,
  role,
  remaining,
  unlimited,
  historyOpen,
  canNewChat,
  onNewChat,
  onToggleHistory,
}: {
  title: string;
  subline: string;
  name: string;
  role: "admin" | "teacher" | "student";
  remaining: number;
  unlimited: boolean;
  historyOpen: boolean;
  canNewChat: boolean;
  onNewChat: () => void;
  onToggleHistory: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      // "local" scope clears the session without waiting on Supabase's
      // /logout round trip — a flaky connection must never strand someone
      // on a page with a permanently-disabled "Çıkış" button.
      await createClient().auth.signOut({ scope: "local" });
    } catch {
      // Still leave.
    } finally {
      window.location.href = "/giris";
    }
  }

  const roleLabel = role === "admin" ? "Yönetici" : role === "teacher" ? "Öğretmen" : "Öğrenci";

  return (
    <header className="pg-bar">
      {/* A brand mark, not a link — the same thing it is on every panel. The
          way back is the labelled button on the right, and only there. */}
      <Image src="/landing/logo-white-tight.png" alt="Nebula Genç Zeka" width={1010} height={343} preload className="h-8 w-auto shrink-0 lg:h-10" />

      <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[color:var(--pn-on-navy-edge)] md:block" />

      <div className="hidden min-w-0 flex-col gap-px md:flex">
        <span className="truncate font-display text-[13px] font-semibold leading-tight text-[color:var(--pn-on-navy)]">{title}</span>
        {/* leading-tight, not leading-none: a 10px line box clips the dots off
            İ and Ü under `truncate`. */}
        <span className="truncate font-mono text-[10px] leading-tight tracking-wide text-[color:var(--pn-on-navy-dim)]">{subline}</span>
      </div>

      <span className="flex-1" />

      <div className="flex items-center gap-[5px] sm:gap-[7px]">
        {/* On a phone this folds into the account menu: five boxes plus the
            logo do not fit a 360px bar, and "back to the panel" is the one
            action that is not about the chat in front of you. */}
        <Link href="/dashboard" aria-label="Panele dön" title="Panele dön" className="pn-bar-btn pn-bar-btn--text hidden sm:inline-flex" prefetch>
          <LayoutGrid className="size-4" strokeWidth={1.9} aria-hidden />
          <span className="hidden lg:inline">Panel</span>
        </Link>

        <button
          type="button"
          onClick={onNewChat}
          disabled={!canNewChat}
          title={canNewChat ? "Yeni sohbet" : "Üretim bitince yeni sohbet açabilirsin"}
          aria-label="Yeni sohbet"
          className="pn-bar-btn pn-bar-btn--text"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">Yeni</span>
        </button>

        <button
          type="button"
          onClick={onToggleHistory}
          aria-pressed={historyOpen}
          data-active={historyOpen}
          title={historyOpen ? "Geçmişi kapat" : "Geçmiş"}
          aria-label="Sohbet geçmişi"
          className="pn-bar-btn pn-bar-btn--text"
        >
          <History className="size-4" strokeWidth={1.9} aria-hidden />
          <span className="hidden sm:inline">Geçmiş</span>
        </button>

        {/* Cevher. Mint for the number — the one figure on the bar that is
            the student's own to spend. ∞ for a teacher: no allowance, no
            countdown they could act on. */}
        <span
          className="pn-bar-btn pn-bar-btn--num"
          title={
            unlimited
              ? "Öğretmen hesabında cevher sınırı yok — üretimler kurum bakiyesinden karşılanıyor."
              : `${formatOre(remaining)} cevher kaldı`
          }
        >
          <Gem className="size-3.5 text-[color:var(--pn-mint)] sm:hidden" strokeWidth={2} aria-hidden />
          <span key={unlimited ? "inf" : remaining} className="text-[13px] text-[color:var(--pn-mint)] duration-300 animate-in fade-in-0 zoom-in-95">
            {unlimited ? "∞" : formatOre(remaining)}
          </span>
          <span className="hidden text-[10px] font-normal tracking-wide text-[color:var(--pn-on-navy-dim)] sm:inline">CEVHER</span>
        </span>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Hesap menüsü"
              title={name || "Hesap"}
              className={cn(
                "grid size-[34px] shrink-0 place-items-center rounded-full bg-[color:var(--pn-violet)] font-display text-[13px] font-semibold text-[color:var(--pn-violet-ink-strong)] shadow-[0_0_0_1px_rgba(220,210,255,.4)] transition-transform duration-[.18s] hover:scale-105",
              )}
            >
              {initialsOf(name)}
            </button>
          </PopoverTrigger>
          {/* Account only. "Panele dön" lives in exactly one place — the button
              in the bar (and the logo, which is the same link) — because the
              same action offered three times is three things to read. */}
          <PopoverContent align="end" sideOffset={8} className="w-56 gap-2 p-2">
            <div className="px-2 pb-1 pt-1">
              <p className="truncate font-display text-[13px] font-semibold text-on-surface">{name || "Hesap"}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">{roleLabel}</p>
            </div>
            <Link href="/dashboard" className="pn-btn pn-btn--sm pn-btn--paper w-full sm:hidden" prefetch onClick={() => setMenuOpen(false)}>
              <LayoutGrid className="size-4" strokeWidth={1.9} aria-hidden />
              Panele dön
            </Link>
            <button type="button" className="pn-btn pn-btn--pink pn-btn--sm w-full" disabled={signingOut} onClick={signOut}>
              <LogOut className="size-4" strokeWidth={1.9} aria-hidden />
              {signingOut ? "Çıkış yapılıyor…" : "Çıkış yap"}
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
