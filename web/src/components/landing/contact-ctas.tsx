"use client";

import type { ReactNode } from "react";
import { siteConfig, whatsappHref } from "@/lib/site";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/brand-icons";
import { track } from "@/lib/analytics";

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
 *
 * `iconOnly` drops the visible label down to just the logo (the hero uses it,
 * where the two coloured pills otherwise shout over the headline). The label
 * still ships as aria-label/title, so screen readers and hover tooltips read
 * the same words as the labelled variant.
 */
export function ContactCtas({ children, iconOnly = false }: { children?: ReactNode; iconOnly?: boolean }) {
  const whatsappLabel = "WhatsApp'tan yazın";
  const instagramLabel = "Instagram'dan yazın";
  const sizing = iconOnly ? "nl-btn--icon" : "nl-btn--lg";
  const iconSize = iconOnly ? "size-[22px]" : "size-[18px]";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
      <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={whatsappLabel}
        title={whatsappLabel}
        onClick={() => track("contact_click", { channel: "whatsapp" })}
        className={`nl-btn ${sizing} nl-btn--green inline-flex`}
      >
        <WhatsappIcon className={iconSize} />
        {!iconOnly && whatsappLabel}
      </a>
      <a
        href={siteConfig.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={instagramLabel}
        title={instagramLabel}
        onClick={() => track("contact_click", { channel: "instagram" })}
        className={`nl-btn ${sizing} nl-btn--amber inline-flex`}
      >
        <InstagramIcon className={iconSize} />
        {!iconOnly && instagramLabel}
      </a>
      {children}
    </div>
  );
}
