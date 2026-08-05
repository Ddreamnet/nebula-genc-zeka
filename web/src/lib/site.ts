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
  price: { amount: "4.000", currency: "TL", period: "ay" },

  whatsapp: {
    number: "905462804836",
    message: "Merhaba, Nebula Genç Zeka hakkında bilgi almak istiyorum.",
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
