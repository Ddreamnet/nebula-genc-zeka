/**
 * Central site config — brand facts, contact, navigation.
 * Single source of truth so copy stays consistent across the app.
 */
export const siteConfig = {
  name: "Nebula Genç Zeka",
  shortName: "Nebula",
  tagline: "Çocuğunuz yapay zekayı izlemesin, kullansın.",
  url: "https://nebulagenczeka.com",
  email: "info@nebulagenczeka.com",
  instagram: "https://instagram.com/nebulagenczeka",
  ageRange: "10–18 yaş",
  founder: "Fatih Böke",

  /**
   * Pricing. NOT published anywhere on the site right now — the FAQ's price
   * question was removed, and the figure is quoted on WhatsApp per family
   * instead. Kept here as the single place to edit if it goes back up, so a
   * number never gets pasted into a component again.
   */
  pricing: {
    monthly: "5.000 TL",
    /** Whole 4-month program paid up front. */
    full: "17.500 TL",
    /** full vs 4 × monthly — stated in the FAQ so the discount is legible. */
    fullSaving: "2.500 TL",
  },

  whatsapp: {
    number: "905462804836",
    message: "Merhaba, Nebula Genç Zeka hakkında bilgi almak istiyorum.",
    /** Sent by the trial CTA, so the first message already says why they wrote. */
    trialMessage: "Merhaba, ücretsiz deneme dersi için bilgi almak istiyorum.",
  },

  /** Public top-nav — anchors into the landing page sections. */
  nav: [
    { label: "Ne?", href: "/#ne-uretiyor" },
    { label: "Nasıl?", href: "/#nasil" },
    { label: "AI", href: "/#ai" },
    { label: "Güven", href: "/#guven" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];

export function whatsappHref(message: string = siteConfig.whatsapp.message) {
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
