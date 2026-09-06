"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { cn } from "@/lib/cn";
import { RailDecor } from "./rail-decor";

/** Bir nav öğesinin ailesi. Hover rengini ve aktif tonu bu belirler. */
export type NavTone = "blue" | "mint" | "peach" | "violet" | "pink";

export interface PanelNavItem {
  key: string;
  /** aria-label ve title — şerit yalnızca ikon gösterir, etiket sesli okunur. */
  label: string;
  icon: LucideIcon;
  tone: NavTone;
  /** Sayfa değiştiren öğeler için (Playground). */
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

const TONE_CLASS: Record<NavTone, string> = {
  blue: "",
  mint: "pn-rail-btn--mint",
  peach: "pn-rail-btn--peach",
  violet: "pn-rail-btn--violet",
  pink: "pn-rail-btn--pink",
};

function NavButton({ item, compact }: { item: PanelNavItem; compact?: boolean }) {
  const Icon = item.icon;
  const className = cn("pn-rail-btn", TONE_CLASS[item.tone], compact && "pn-rail-btn--bar");
  // strokeWidth 1.9: lucide varsayılanı 2, krem zeminde 1.7 kullanılıyor.
  // Koyu zemin daha kalın kalem ister — aynı kalınlık lacivertin üstünde
  // ince ve soluk okunur.
  const glyph = <Icon className={compact ? "size-4.5" : "size-5"} strokeWidth={1.9} aria-hidden />;

  if (item.href) {
    return (
      <Link href={item.href} aria-label={item.label} title={item.label} className={className} data-active={item.active}>
        {glyph}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={item.label}
      title={item.label}
      className={className}
      data-active={item.active}
      aria-pressed={item.active}
      onClick={item.onClick}
    >
      {glyph}
    </button>
  );
}

export interface PanelShellProps {
  /** "İyi dersler, Selin" — genel bir karşılama değil, işin başında söylenen şey. */
  greeting: string;
  /** "SALI, 6 EYLÜL · BUGÜN 3 DERS" — mono, küçük, bağlam satırı. */
  subline?: string;
  nav: PanelNavItem[];
  /** Dakika bakiyesi gibi bir sayı çipi. */
  chip?: ReactNode;
  /** Bildirim zili (kendi popover'ını taşır). */
  bell?: ReactNode;
  /** Zil rozetinin sayısı — mobilde hamburgere taşınır. */
  unreadCount?: number;
  initials: string;
  onSignOut: () => void;
  signingOut?: boolean;
  children: ReactNode;
}

/**
 * Panelin dış iskeleti: birleşik L navigasyon + içerik alanı.
 *
 * Üç rol de (öğretmen, öğrenci, admin) bunu kullanır; aralarındaki tek fark
 * `nav` dizisi ve içeriktir. Kabuğun kendisi hiçbir rol bilmez — bilseydi
 * üç panelin görünümü birbirinden ayrı düşerdi, ki eski panellerin sorunu
 * tam olarak buydu.
 *
 * Masaüstünde şerit + bar, mobilde yalnızca bar (şerit dört ikon için bir
 * ekran kenarını harcamaya değmez; mobilde ikonlar barın sağına geçer).
 */
export function PanelShell({
  greeting,
  subline,
  nav,
  chip,
  bell,
  unreadCount = 0,
  initials,
  onSignOut,
  signingOut,
  children,
}: PanelShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="pn-shell">
      {/* ---- Şerit: yalnızca masaüstü. Dekor + dikeyde ortalanmış ikonlar. */}
      <div className="pn-shell-rail hidden lg:block" aria-hidden={false}>
        <RailDecor />
        <nav
          aria-label="Panel navigasyonu"
          className="absolute inset-x-0 bottom-2 top-[60px] flex flex-col items-center justify-center gap-1.5"
        >
          {nav.map((item) => (
            <NavButton key={item.key} item={item} />
          ))}
        </nav>
      </div>

      {/* ---- Bar. Mobilde tek nav yüzeyi, masaüstünde marka + sağ küme. */}
      <header className="pn-shell-bar flex items-center gap-2 pl-3 pr-2 lg:pl-4 lg:pr-2.5">
        {/* Barda kelime logosu durur, yuvarlak/kare marka işareti değil:
            lacivert bir şeridin üstünde okunması gereken şey isimdir.
            width/height next/image'ın srcset'i kurduğu İÇSEL ölçüdür,
            ekrandaki ölçü değil — onu h-* + w-auto belirler. */}
        <Image
          src="/landing/logo-white.png"
          alt="Nebula Genç Zeka"
          width={232}
          height={116}
          preload
          className="h-[26px] w-auto shrink-0 lg:h-10"
        />

        <div className="hidden min-w-0 flex-col lg:flex">
          <span className="truncate font-display text-[13px] font-semibold leading-tight text-[color:var(--pn-on-navy)]">
            {greeting}
          </span>
          {subline && (
            <span className="truncate font-mono text-[9.5px] leading-tight tracking-wide text-[color:var(--pn-on-navy-dim)]">
              {subline}
            </span>
          )}
        </div>

        <span className="flex-1" />

        {/* Mobil: nav ikonları barın sağında. Masaüstünde şeritte oldukları
            için burada gizlenirler — aynı düğmeler iki kez render edilmez,
            biri gizlenir; ikisi de DOM'da olsaydı sekme sırası bozulurdu. */}
        <nav aria-label="Panel navigasyonu" className="flex items-center gap-1.5 lg:hidden">
          {nav.map((item) => (
            <NavButton key={item.key} item={item} compact />
          ))}
        </nav>

        {/* Masaüstü sağ küme: dakika çipi · zil · çıkış · avatar. */}
        <div className="hidden items-center gap-2 lg:flex">
          {chip}
          {bell}
          <button
            type="button"
            aria-label="Çıkış yap"
            title="Çıkış yap"
            className="pn-bar-ghost"
            disabled={signingOut}
            onClick={onSignOut}
          >
            <LogOut className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
          <Avatar initials={initials} />
        </div>

        {/* Mobil: bildirim, profil ve çıkış hamburgerin içinde. Rozet oraya
            taşınır — barda ikinci bir sayı göstergesi olmaz. */}
        <div className="lg:hidden">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Menü" className="pn-bar-ghost relative">
                <Menu className="size-4" strokeWidth={1.9} aria-hidden />
                {unreadCount > 0 && <span className="pn-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-60 gap-3 p-3">
              <div className="flex items-center gap-2.5">
                <Avatar initials={initials} />
                <div className="min-w-0">
                  <p className="truncate font-display text-[13px] font-semibold text-on-surface">{greeting}</p>
                  {subline && <p className="truncate font-mono text-[10px] text-on-surface-variant">{subline}</p>}
                </div>
              </div>
              {chip && <div className="flex items-center gap-2">{chip}</div>}
              {bell && <div onClick={() => setMenuOpen(false)}>{bell}</div>}
              <button type="button" className="pn-btn pn-btn--pink w-full" disabled={signingOut} onClick={onSignOut}>
                <LogOut className="size-4" strokeWidth={1.9} aria-hidden />
                {signingOut ? "Çıkış yapılıyor…" : "Çıkış yap"}
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Dikiş yaması barın konturunu şeridin üstünde gizler. Masaüstü-only:
          mobilde şerit yok, gizlenecek birleşim de yok. */}
      <div className="pn-shell-seam hidden lg:block" aria-hidden />

      <main className="pn-shell-content">{children}</main>
    </div>
  );
}

/** 34px daire, baş harfler. Fotoğraf yükleme yetkisi admin'de (bkz. handoff). */
function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[color:var(--pn-violet)] font-display text-[13px] font-semibold text-[color:var(--pn-violet-ink-strong)] shadow-[0_0_0_1px_rgba(220,210,255,.4)]"
    >
      {initials}
    </span>
  );
}
