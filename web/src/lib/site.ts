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
  // TODO(fatih): Instagram kullanıcı adını doğrula
  instagram: "https://instagram.com/nebulagenczeka",
  ageRange: "10–16 yaş",
  founder: "Fatih Böke",
  price: { amount: "4.000", currency: "TL", period: "ay" },

  /** Public top-nav. On-page sections use hash links; Playground is a real route. */
  nav: [
    { label: "Nasıl Çalışır", href: "/#nasil" },
    { label: "Müfredat", href: "/#mufredat" },
    { label: "Playground", href: "/playground" },
    { label: "Fiyat", href: "/#fiyat" },
    { label: "SSS", href: "/#sss" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
