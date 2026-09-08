"use client";

import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTrigger } from "@/components/panel-ui/sheet";
import { Mail, Phone } from "lucide-react";
import { siteConfig, whatsappHref } from "@/lib/site";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/brand-icons";

/**
 * İletişim bilgileri.
 *
 * İki kullanım biçimi var: kendi düğmesiyle (eski çağrı yerleri) ya da
 * dışarıdan kontrol edilerek (`open`/`onOpenChange`) — ikincisi panel
 * navigasyonundan açılabilmesi için. Kontrollü modda kendi düğmesini
 * çizmez; yoksa aynı eylemi açan iki düğme olurdu.
 */
export function ContactDialog({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const controlled = open !== undefined;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {!controlled && (
        <SheetTrigger asChild>
          <button type="button" aria-label="İletişim" className="pn-btn pn-btn--sm pn-btn--navy">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">İletişim</span>
          </button>
        </SheetTrigger>
      )}
      <SheetContent size="sm" onDismiss={() => onOpenChange?.(false)}>
        <SheetHeader tone="pink" title="İletişim" subtitle="Bize en hızlı böyle ulaşırsın" />
        <SheetBody className="flex flex-col gap-2">
          {[
            { icon: <WhatsappIcon className="size-5 shrink-0 text-[#2c7a58]" />, name: "WhatsApp", label: "+90 546 280 48 36", href: whatsappHref(), tint: "var(--pn-mint-tint)", line: "var(--pn-mint-line)" },
            { icon: <InstagramIcon className="size-5 shrink-0 text-[#CE3B5F]" />, name: "Instagram", label: "@nebulagenczeka", href: siteConfig.instagram, tint: "var(--pn-pink-tint)", line: "var(--pn-pink-line)" },
            { icon: <Mail className="size-5 shrink-0 text-[color:var(--pn-blue-ink)]" strokeWidth={1.9} />, name: "E-posta", label: siteConfig.email, href: `mailto:${siteConfig.email}`, tint: "var(--pn-blue-tint)", line: "var(--pn-blue-line)" },
          ].map((row) => (
            // The whole row is the link: a thumb should not have to find the
            // small blue text inside the card.
            <a
              key={row.name}
              href={row.href}
              target={row.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              className="flex min-h-14 items-center gap-3 rounded-[12px] border px-3 py-2.5 no-underline transition-transform duration-[.18s] hover:-translate-y-px"
              style={{ background: row.tint, borderColor: row.line }}
            >
              {row.icon}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-on-surface">{row.name}</span>
                <span className="block truncate text-[12px] text-on-surface-variant">{row.label}</span>
              </span>
            </a>
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
