"use client";

import type { ReactNode } from "react";
import { siteConfig, whatsappHref } from "@/lib/site";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/brand-icons";
import { PaperButton } from "@/components/ui/paper-button";
import { track } from "@/lib/analytics";

/**
 * The site's single contact CTA pair. Hero, the closing section and the
 * dead-end pages all render this same component so the two channels can't
 * drift apart again — they used to read "Instagram'dan yazın →" in one place
 * and "Instagram · @nebulagenczeka" in the other, at different widths, and the
 * hero offered Instagram with no WhatsApp beside it at all.
 *
 * `variant` controls the label only, never the target or the styling:
 *  - "trial" → "Ücretsiz deneme dersi al", for the hero and the closing
 *              section. The free trial is the strongest offer on the site and
 *              it used to appear only as grey 12px microcopy under the hero
 *              and as a card heading in the trust section — never as
 *              something you could click. Naming the offer instead of the
 *              channel is the whole point; WhatsApp is how it happens, not
 *              what is being offered. Instagram stays short beside it so one
 *              request is obviously primary.
 *  - "full"  → "WhatsApp'tan yazın", where the channel itself is the message.
 *  - "short" → just the brand name, for the 404/error pages, where two long
 *              coloured pills shouted over the headline.
 *
 * Either way the accessible name stays the full sentence, so a screen reader
 * and a hover tooltip both say what the button actually does.
 *
 * `children` takes any page-specific extra button (the hero's "Nasıl işliyor?")
 * so it shares the same wrapping row.
 */
export function ContactCtas({
  children,
  variant = "full",
}: {
  children?: ReactNode;
  variant?: "trial" | "full" | "short";
}) {
  const whatsapp = {
    name: "WhatsApp",
    action: variant === "trial" ? "Ücretsiz deneme dersi al" : "WhatsApp'tan yazın",
  };
  const instagram = { name: "Instagram", action: "Instagram'dan yazın" };

  // "trial" labels WhatsApp with the offer but leaves Instagram short: two
  // full-length pills side by side read as two equal asks, which is exactly
  // the ambiguity this variant exists to remove.
  const label = (c: { name: string; action: string }) =>
    variant === "full" || (variant === "trial" && c === whatsapp) ? c.action : c.name;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
      <PaperButton
        href={whatsappHref(
          variant === "trial" ? siteConfig.whatsapp.trialMessage : undefined,
        )}
        tone="green"
        aria-label={whatsapp.action}
        title={whatsapp.action}
        onClick={() => track("contact_click", { channel: "whatsapp", variant })}
      >
        <WhatsappIcon className="size-[19px]" />
        {label(whatsapp)}
      </PaperButton>
      <PaperButton
        href={siteConfig.instagram}
        tone="coral"
        aria-label={instagram.action}
        title={instagram.action}
        onClick={() => track("contact_click", { channel: "instagram" })}
      >
        <InstagramIcon className="size-[19px]" />
        {label(instagram)}
      </PaperButton>
      {children}
    </div>
  );
}
