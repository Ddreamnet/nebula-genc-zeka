/**
 * One call that reaches whichever measurement tools happen to be switched on.
 *
 * The number worth watching on this site isn't pageviews — it's how many
 * visitors actually open WhatsApp or Instagram to write. That's a click on an
 * outbound link, which no analytics tool counts on its own, so those clicks
 * have to be reported explicitly. Everything here no-ops when the tools aren't
 * configured (see components/site/analytics.tsx).
 */
type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: string, event: string, params?: EventParams) => void;
    fbq?: (command: string, event: string, params?: EventParams) => void;
  }
}

export function track(event: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
    // Meta's own vocabulary: "Contact" is the standard event for someone
    // reaching out, so it lands in Ads Manager as a real conversion instead
    // of an unmapped custom event.
    window.fbq?.("trackCustom", event, params);
    if (event === "contact_click") window.fbq?.("track", "Contact", params);
  } catch {
    // A blocked or half-loaded tracker must never break a CTA click.
  }
}
