"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/panel-ui/popover";
import { cn } from "@/lib/cn";

/** Bir döşemenin pastel ailesi. Pembe her zaman çıkış ya da geri dönüştür. */
export type NavTone = "blue" | "mint" | "peach" | "violet" | "pink";

export interface PanelNavItem {
  key: string;
  /** Döşemenin altında yazan ad (kısa, tek kelime) — versal çizilir. */
  label: string;
  /** Uzun ad: title, aria-label ve mobil menü satırı. Yoksa `label`. */
  title?: string;
  icon: LucideIcon;
  tone: NavTone;
  /** Sayfa değiştiren öğeler için (Atölye). */
  href?: string;
  onClick?: () => void;
  active?: boolean;
  /** Mobilde barda mı durur, menüde mi. Varsayılan: bar. */
  mobile?: "bar" | "menu";
  /** Verilirse döşeme bir açılır liste olur (ör. admin'in "Yönetim"i). */
  items?: PanelNavItem[];
}

type TileProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  icon: LucideIcon;
  label: string;
  tone: NavTone;
  active?: boolean;
  badge?: number;
};

/**
 * Barın döşemesi: pastel dolgu, ikon ve altında adı. 5a'nın ilk kuralı —
 * "butonlar adlarıyla birlikte durur" — masaüstünde de telefonda da geçerli;
 * telefonda döşeme küçülür, adı kalır.
 *
 * Bildirim zilleri PopoverTrigger asChild ile bunu kullandığı için bütün
 * prop'lar (ref dahil) düğmeye geçer.
 */
export function PanelTile({ icon: Icon, label, tone, active, badge, className, ...rest }: TileProps) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      aria-pressed={rest["aria-haspopup"] ? undefined : active}
      className={cn("pn-tile", `pn-tile--${tone}`, className)}
      {...rest}
    >
      <Icon className="pn-tile-icon" strokeWidth={1.9} aria-hidden />
      <span className="pn-tile-label">{label}</span>
      {!!badge && badge > 0 && <span className="pn-badge">{badge > 9 ? "9+" : badge}</span>}
    </button>
  );
}

function TileLink({ item, className }: { item: PanelNavItem; className?: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href!}
      title={item.title ?? item.label}
      aria-label={item.title ?? item.label}
      className={cn("pn-tile", `pn-tile--${item.tone}`, className)}
    >
      <Icon className="pn-tile-icon" strokeWidth={1.9} aria-hidden />
      <span className="pn-tile-label">{item.label}</span>
    </Link>
  );
}

/** Menü satırı: mobil menüde ve açılır döşemelerde aynı satır. */
function MenuRow({ item, onDone, disabled }: { item: PanelNavItem; onDone: () => void; disabled?: boolean }) {
  const Icon = item.icon;
  const className = cn("pn-menu-row", `pn-menu-row--${item.tone}`);
  const body = (
    <>
      <span className="pn-menu-row-icon" aria-hidden>
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      {item.title ?? item.label}
    </>
  );
  return item.href ? (
    <Link href={item.href} className={className} onClick={onDone}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        onDone();
        item.onClick?.();
      }}
    >
      {body}
    </button>
  );
}

function NavTile({ item, className }: { item: PanelNavItem; className?: string }) {
  const [open, setOpen] = useState(false);
  if (item.href) return <TileLink item={item} className={className} />;
  if (item.items) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PanelTile
            icon={item.icon}
            label={item.label}
            tone={item.tone}
            active={open}
            title={item.title ?? item.label}
            aria-haspopup="menu"
            className={className}
          />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={10} className="w-60 gap-1 p-1.5">
          {item.items.map((sub) => (
            <MenuRow key={sub.key} item={sub} onDone={() => setOpen(false)} />
          ))}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <PanelTile
      icon={item.icon}
      label={item.label}
      tone={item.tone}
      active={item.active}
      title={item.title ?? item.label}
      onClick={item.onClick}
      className={className}
    />
  );
}

export interface PanelShellProps {
  /** "İyi dersler, Selin" — işin başında söylenen şey. */
  greeting: string;
  /** "21 EYLÜL PAZARTESİ · BUGÜN 3 DERS" — mono, küçük, bağlam satırı. */
  subline?: string;
  nav: PanelNavItem[];
  /** Bildirim zili — bir PanelTile döndürür (kendi popover'ını taşır).
   *  Telefonda da barda kalır: menünün içindeki bir popover, menü kapanınca
   *  çapasını kaybeder. */
  bell?: ReactNode;
  onSignOut: () => void;
  signingOut?: boolean;
  children: ReactNode;
}

/**
 * Panelin dış iskeleti (5a): çerçevenin üstünde yüzen tek lacivert bar ve
 * altında içerik. Sol şerit yok — dört-beş eylem için ekranın bir kenarını
 * harcamaya değmiyordu ve ikonları ADSIZ bırakıyordu.
 *
 * Üç rol de bunu kullanır; aralarındaki tek fark `nav` ve içerik.
 */
export function PanelShell({ greeting, subline, nav, bell, onSignOut, signingOut, children }: PanelShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuNav = nav.filter((item) => item.mobile === "menu").flatMap((item) => item.items ?? [item]);

  return (
    <div className="pn-shell">
      <header className="pn-shell-bar">
        {/* KIRPILMIŞ logo: özgün PNG'nin %35'i boş tuval, 38px'te alt satır
            ("GENÇ ZEKA") okunmaz oluyordu. */}
        <Image
          src="/landing/logo-white-tight.png"
          alt="Nebula Genç Zeka"
          width={1010}
          height={343}
          preload
          className="h-[26px] w-auto shrink-0 lg:h-[38px]"
        />

        <span aria-hidden className="hidden h-9 w-px shrink-0 bg-[color:var(--pn-on-navy-edge)] lg:block" />

        {/* leading-tight (leading-none değil): truncate + dar satır kutusu
            İ ve Ü'nün noktalarını kırpıyordu. */}
        <div className="hidden min-w-0 flex-col gap-1 lg:flex">
          <span className="truncate font-display text-[15px] font-semibold leading-tight tracking-[-.015em] text-[color:var(--pn-on-navy)]">
            {greeting}
          </span>
          {subline && (
            <span className="truncate font-mono text-[10px] font-medium uppercase leading-tight tracking-[.12em] text-[color:var(--pn-on-navy-dim)]">
              {subline}
            </span>
          )}
        </div>

        <span className="flex-1" />

        {/* TEK nav: bir döşeme iki kez render edilmez. Zil kendi verisini
            ve realtime kanalını taşıyabilir (admin zili öyle) — masaüstü ve
            telefon için ayrı iki liste, aynı adlı kanala iki abonelik açıp
            sayfayı çökertiyordu. Telefonda menüye düşen döşemeler yalnızca
            CSS ile gizlenir; masaüstünde çıkış, telefonda "Menü" sondadır. */}
        <nav aria-label="Panel navigasyonu" className="flex items-center gap-1 lg:gap-2.5">
          {nav.map((item) => (
            <NavTile key={item.key} item={item} className={item.mobile === "menu" ? "max-lg:!hidden" : undefined} />
          ))}
          {bell}
          <PanelTile
            icon={LogOut}
            label="Çıkış"
            tone="pink"
            title="Çıkış yap"
            disabled={signingOut}
            onClick={onSignOut}
            className="max-lg:!hidden"
          />
          {/* Menü döşemesi de adını taşır ("MENÜ") — adsız bir hamburger
              5a'nın ilk kuralını bozardı. */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <PanelTile
                icon={Menu}
                label="Menü"
                tone="pink"
                active={menuOpen}
                aria-haspopup="menu"
                aria-label="Menü"
                className="lg:!hidden"
              />
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} className="w-64 gap-1 p-1.5">
              <div className="px-2 pb-1.5 pt-1">
                <p className="truncate font-display text-[14px] font-semibold text-on-surface">{greeting}</p>
                {subline && (
                  <p className="truncate font-mono text-[10px] uppercase tracking-[.08em] text-on-surface-variant">{subline}</p>
                )}
              </div>
              {menuNav.map((item) => (
                <MenuRow key={item.key} item={item} onDone={() => setMenuOpen(false)} />
              ))}
              <MenuRow
                item={{ key: "exit", label: signingOut ? "Çıkış yapılıyor…" : "Çıkış yap", icon: LogOut, tone: "pink", onClick: onSignOut }}
                onDone={() => setMenuOpen(false)}
                disabled={signingOut}
              />
            </PopoverContent>
          </Popover>
        </nav>
      </header>

      <main className="pn-shell-content">{children}</main>
    </div>
  );
}
