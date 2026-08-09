import type { ReactNode } from "react";
import { siteConfig, whatsappHref } from "@/lib/site";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/brand-icons";

/**
 * The site's single contact CTA pair. Hero and the closing section render
 * this same component so the two channels can't drift apart again — they
 * used to read "Instagram'dan yazın →" in one place and
 * "Instagram · @nebulagenczeka" in the other, at different widths, and the
 * hero offered Instagram with no WhatsApp beside it at all.
 *
 * Both channels are messaging channels, so both get the same verb, the same
 * size and their real logo. `children` takes any page-specific extra button
 * (the hero's "Nasıl işliyor") so it shares the same wrapping row.
 */
export function ContactCtas({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
      <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="nl-btn nl-btn--lg nl-btn--green inline-flex">
        <WhatsappIcon className="size-[18px]" />
        WhatsApp&apos;tan yazın
      </a>
      <a href={siteConfig.instagram} target="_blank" rel="noopener noreferrer" className="nl-btn nl-btn--lg nl-btn--amber inline-flex">
        <InstagramIcon className="size-[18px]" />
        Instagram&apos;dan yazın
      </a>
      {children}
    </div>
  );
}
