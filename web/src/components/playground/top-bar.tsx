"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { History, LayoutGrid, LogOut, Menu, Moon, Plus, Gem } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { createClient } from "@/lib/supabase/client";
import type { PlaygroundTool } from "@/lib/playground/tools";
import { ModelChip, ModelPicker } from "./model-picker";

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
 * 34px control boxes.
 *
 * Left is what you are working with: the brand, the model (the catalog hangs
 * off it), and the open chat's title. Right is what you can do about it: start
 * a new chat, or open the one menu. Cevher, history and the account all sit
 * inside that menu — a bar that spells out five things at once is read as
 * decoration, and only "which model" and "new chat" are touched often enough
 * to earn a permanent box.
 */
export function TopBar({
  title,
  subline,
  name,
  role,
  tool,
  onSelectTool,
  pickerLocked,
  remaining,
  unlimited,
  historyOpen,
  canNewChat,
  onNewChat,
  onToggleHistory,
  darkTheme,
  onToggleTheme,
}: {
  title: string;
  subline: string;
  name: string;
  role: "admin" | "teacher" | "student";
  tool: PlaygroundTool;
  onSelectTool: (tool: PlaygroundTool) => void;
  /** A generation or a lesson run is walking — the model must not change under it. */
  pickerLocked: boolean;
  remaining: number;
  unlimited: boolean;
  historyOpen: boolean;
  canNewChat: boolean;
  onNewChat: () => void;
  onToggleHistory: () => void;
  /** The dark "Koyu" theme is on. */
  darkTheme: boolean;
  /** Absent for a student: the switch is not drawn at all. */
  onToggleTheme?: () => void;
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

      <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[color:var(--pn-on-navy-edge)] sm:block" />

      {/* Which model — the bar's job, not the composer's. It belongs with the
          chat's identity, up here, where it stays legible while you type. */}
      <ModelPicker activeTool={tool} onSelect={onSelectTool}>
        <ModelChip tool={tool} disabled={pickerLocked} />
      </ModelPicker>

      <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[color:var(--pn-on-navy-edge)] lg:block" />

      <div className="hidden min-w-0 flex-col gap-px lg:flex">
        <span className="truncate font-display text-[13px] font-semibold leading-tight text-[color:var(--pn-on-navy)]">{title}</span>
        {/* leading-tight, not leading-none: a 10px line box clips the dots off
            İ and Ü under `truncate`. */}
        {subline && <span className="truncate font-mono text-[10px] leading-tight tracking-wide text-[color:var(--pn-on-navy-dim)]">{subline}</span>}
      </div>

      <span className="flex-1" />

      <div className="flex items-center gap-[5px] sm:gap-[7px]">
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

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Menü" title={name || "Menü"} data-active={menuOpen} className="pn-bar-btn">
              <Menu className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </PopoverTrigger>
          {/* Everything that is read rather than pressed: who you are, what
              you have left to spend, the chats behind this one, the way out. */}
          <PopoverContent align="end" sideOffset={8} className="w-60 gap-2 p-2">
            <div className="flex items-center gap-2.5 px-1 pt-1">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--pn-violet)] font-display text-[13px] font-semibold text-[color:var(--pn-violet-ink-strong)]">
                {initialsOf(name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[13px] font-semibold text-on-surface">{name || "Hesap"}</span>
                <span className="block font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">{roleLabel}</span>
              </span>
            </div>

            {/* Cevher. Read-only, so it is a line and not a button — mint for
                the number, the one figure here that is the student's own to
                spend. ∞ for a teacher: no allowance, no countdown to act on. */}
            <div
              className="flex items-center gap-2 rounded-[10px] border border-[color:var(--pn-mint-line)] bg-[color:var(--pn-mint-tint)] px-2.5 py-2"
              title={
                unlimited
                  ? "Öğretmen hesabında cevher sınırı yok — üretimler kurum bakiyesinden karşılanıyor."
                  : `${formatOre(remaining)} cevher kaldı`
              }
            >
              <Gem className="size-4 shrink-0 text-[color:var(--pn-mint-ink-strong)]" strokeWidth={1.9} aria-hidden />
              <span className="flex-1 text-[12px] font-semibold text-[color:var(--pn-mint-ink-strong)]">Cevher</span>
              <span
                key={unlimited ? "inf" : remaining}
                className="font-mono text-[14px] font-bold tabular-nums text-[color:var(--pn-mint-ink-strong)] duration-300 animate-in fade-in-0 zoom-in-95"
              >
                {unlimited ? "∞" : formatOre(remaining)}
              </span>
            </div>

            {/* Theme. A real switch rather than a button so the state reads
                without pressing; peach when on, because the dark theme's one
                accent is terracotta and this is its first appearance. Only an
                admin or teacher is handed the handler, so only they see it. */}
            {onToggleTheme && (
              <button
                type="button"
                role="switch"
                aria-checked={darkTheme}
                onClick={onToggleTheme}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left transition-colors duration-[.16s]",
                  darkTheme
                    ? "border-[color:var(--pn-peach-line)] bg-[color:var(--pn-peach-tint)]"
                    : "border-[color:var(--pn-hair)] bg-surface-container hover:bg-surface-low",
                )}
              >
                <Moon
                  className={cn("size-4 shrink-0", darkTheme ? "text-[color:var(--pn-peach-ink-strong)]" : "text-on-surface-variant")}
                  strokeWidth={1.9}
                  aria-hidden
                />
                <span className={cn("flex-1 text-[12px] font-semibold", darkTheme ? "text-[color:var(--pn-peach-ink-strong)]" : "text-on-surface")}>
                  Koyu tema
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-[2px] transition-colors duration-[.16s]",
                    darkTheme ? "border-[color:var(--pn-peach-ink)] bg-[color:var(--pn-peach-ink)]" : "border-[color:var(--pn-hair-strong)] bg-surface-low",
                  )}
                >
                  <span className={cn("size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out", darkTheme ? "translate-x-4" : "translate-x-0")} />
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onToggleHistory();
              }}
              aria-pressed={historyOpen}
              className="pn-btn pn-btn--sm pn-btn--paper w-full"
            >
              <History className="size-4" strokeWidth={1.9} aria-hidden />
              {historyOpen ? "Geçmişi kapat" : "Sohbet geçmişi"}
            </button>

            <Link href="/dashboard" className="pn-btn pn-btn--sm pn-btn--paper w-full" prefetch onClick={() => setMenuOpen(false)}>
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
