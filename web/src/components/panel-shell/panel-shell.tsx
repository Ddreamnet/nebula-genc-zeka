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

  // Mobil barın taşıma sınırı. Dört, çünkü 360px'lik en dar ekranda
  // logo (52) + 4 × 34 + 4 × 6 boşluk + hamburger (34) + kenarlar tam sığar;
  // beşincisi logoyu kırpardı.
  const barNav = nav.slice(0, 4);
  const menuNav = nav.slice(4);

  return (
    <div className="pn-shell">
      {/* ---- Şerit: yalnızca masaüstü. Dekor + dikeyde ortalanmış ikonlar. */}
      <div className="pn-shell-rail hidden lg:block" aria-hidden={false}>
        <RailDecor />
        {/* İkonlar şeridin ORTASINDA değil, ÜSTÜNDE: ilk ikonun üst kenarı
            içerik kolonundaki ilk kartın üst kenarıyla aynı çizgide
            (nav + gap = 71px, yani viewport'ta 89px). Ortalanmış ikonlar
            uzun bir ekranda bardan da içerikten de kopuk, boşlukta asılı
            duruyordu; L'nin köşesinden başlayan bir sütun tek parça okunur. */}
        <nav
          aria-label="Panel navigasyonu"
          className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1.5"
          style={{ top: "calc(var(--shell-nav) + var(--shell-gap))" }}
        >
          {nav.map((item) => (
            <NavButton key={item.key} item={item} />
          ))}
        </nav>
      </div>

      {/* ---- Bar. Mobilde tek nav yüzeyi, masaüstünde marka + sağ küme. */}
      {/* Masaüstünde barın içeriği ŞERİDİN BİTTİĞİ yerden başlar: nav + gap.
          Bar zaten `pad` kadar içeride olduğu için logonun sol kenarı tam
          olarak pad + nav + gap'e — yani altındaki içerik kolonunun sol
          kenarına — oturur. Marka ile ilk kart aynı dikey çizgide.

          İkinci ve daha somut sebep: barın sol alt köşesi (17px kavis +
          gölge) şeridin üstüne düşüyor ve oradaki birleşimi gizleyen yama
          (.pn-shell-seam) bardan SONRA boyanıyor. Logo eskiden x=38'de
          başlıyordu ve yamanın altında kalan "GENÇ" hecesi ekranda hiç
          görünmüyordu. Sorun katman sırasıyla değil YERLEŞİMLE çözülüyor:
          logo artık o bölgeye hiç girmiyor. */}
      <header className="pn-shell-bar flex items-center gap-[9px] pl-[13px] pr-[9px] lg:gap-[13px] lg:pl-[calc(var(--shell-nav)+var(--shell-gap))] lg:pr-[13px]">
        {/* Barda kelime logosu durur, yuvarlak/kare marka işareti değil:
            lacivert bir şeridin üstünde okunması gereken şey isimdir.

            KIRPILMIŞ dosya (`-tight`) kullanılıyor: özgün PNG 1024×512'lik
            bir tuvalde duruyor ama mürekkep yalnızca y 59–393 arasında —
            yani yüksekliğin %35'i boş. Tuvalin tamamı 40px'e ölçeklendiğinde
            alt satır ("GENÇ ZEKA") 6.8px'lik bir versal boyuna düşüyor ve
            okunmuyordu. Aynı 40px'te kırpılmış dosyada alt satır 10.4px:
            görünen boyut değişmedi, ÖLÇEK değişti.

            width/height next/image'ın srcset'i kurduğu İÇSEL ölçüdür,
            ekrandaki ölçü değil — onu h-* + w-auto belirler. */}
        <Image
          src="/landing/logo-white-tight.png"
          alt="Nebula Genç Zeka"
          width={1010}
          height={343}
          preload
          className="h-8 w-auto shrink-0 lg:h-10"
        />

        {/* Marka ile karşılamayı ayıran saç çizgisi. İkisi de açık mürekkep
            olduğu için bitişikken tek bir blok gibi okunuyorlardı; çizgi
            13px'lik iki boşlukla birlikte "burada logo biter, burada sen
            başlarsın" der. */}
        <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[color:var(--pn-on-navy-edge)] lg:block" />

        <div className="hidden min-w-0 flex-col gap-px lg:flex">
          <span className="truncate font-display text-[13px] font-semibold leading-tight text-[color:var(--pn-on-navy)]">
            {greeting}
          </span>
          {/* leading-tight, leading-none DEĞİL: `truncate` overflow'u gizler
              ve satır kutusu tam 10px olduğunda İ'nin noktası, Ü'nün çift
              noktası kutunun dışında kalıp kırpılıyordu — "PAZARTESİ"
              ekranda "PAZARTESI" olarak okunuyordu. */}
          {subline && (
            <span className="truncate font-mono text-[10px] leading-tight tracking-wide text-[color:var(--pn-on-navy-dim)]">
              {subline}
            </span>
          )}
        </div>

        <span className="flex-1" />

        {/* Mobil: nav ikonları barın sağında. Dar bir barda dört ikondan
            fazlası logoyu ezer, o yüzden ilk dört burada durur ve gerisi
            hamburgerin içine, ETİKETLİ satırlar olarak düşer — ikon şeridinde
            sıkışıp okunamayan bir beşinci ikondan iyidir. */}
        <nav aria-label="Panel navigasyonu" className="flex items-center gap-1.5 lg:hidden">
          {barNav.map((item) => (
            <NavButton key={item.key} item={item} compact />
          ))}
        </nav>

        {/* Masaüstü sağ küme: dakika sayısı · zil · çıkış. Üçü de aynı kutu
            (bkz. .pn-bar-btn); aralarındaki fark yalnızca içerik.

            AVATAR BURADA YOK, bilerek: baş harfleri gösteren bir daire, adı
            iki santim solda yazılı olan kişiyi ikinci kez tanıtıyordu. Gerçek
            bir profil fotoğrafı olsaydı bilgi taşırdı — `teachers.avatar_url`
            şemada yok. Avatar mobil menüde kalır, çünkü orada karşılama
            satırı görünmüyor. */}
        <div className="hidden items-center gap-[7px] lg:flex">
          {chip}
          {bell}
          <button
            type="button"
            aria-label="Çıkış yap"
            title="Çıkış yap"
            className="pn-bar-btn pn-bar-btn--exit"
            disabled={signingOut}
            onClick={onSignOut}
          >
            <LogOut className="size-4" strokeWidth={1.9} aria-hidden />
          </button>
        </div>

        {/* Mobil: bildirim, profil ve çıkış hamburgerin içinde. Rozet oraya
            taşınır — barda ikinci bir sayı göstergesi olmaz. */}
        <div className="lg:hidden">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Menü" className="pn-bar-btn relative">
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

              {menuNav.length > 0 && (
                <div className="flex flex-col gap-1 border-y border-[color:var(--pn-hair)] py-2">
                  {menuNav.map((item) => {
                    const Icon = item.icon;
                    const body = (
                      <>
                        <Icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
                        {item.label}
                      </>
                    );
                    const className =
                      "flex min-h-11 items-center gap-2.5 rounded-[10px] px-2 text-[13px] font-semibold text-on-surface transition-colors hover:bg-[color:var(--pn-blue-tint)]";
                    return item.href ? (
                      <Link key={item.key} href={item.href} className={className} onClick={() => setMenuOpen(false)}>
                        {body}
                      </Link>
                    ) : (
                      <button
                        key={item.key}
                        type="button"
                        className={className}
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick?.();
                        }}
                      >
                        {body}
                      </button>
                    );
                  })}
                </div>
              )}

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

      {/* L'nin iç köşesindeki içbükey kavis. Dışarıda her köşe yuvarlakken
          burası tek keskin açıydı. */}
      <div className="pn-shell-notch hidden lg:block" aria-hidden />

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
