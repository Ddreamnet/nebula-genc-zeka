import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/site/analytics";

// next/font preloads whatever a layout applies on EVERY route that layout
// wraps, and the root layout wraps every route — so fonts only Playground
// needs (the original "Cosmic Intellectual Horizon" set: Space Grotesk,
// Manrope, JetBrains Mono) live in app/playground/layout.tsx instead, scoped
// to just that one route. Plex Mono is the one face that genuinely is needed
// everywhere: directly by (marketing), and by giriş/dashboard/playground via
// the scoped --font-mono override in globals.css's .panel-theme/.pg-theme
// blocks. IBM Plex Sans used to be the panel body face and was loaded here
// for that; the panels now use Nunito (loaded by their own layouts via
// lib/landing-fonts), so it is gone — it was being downloaded on every route
// in the app and rendered on none. Archivo went the same way for the same
// reason (see lib/prose-font.ts): three weights preloaded app-wide for one
// <h1> on the blog and the two legal pages.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const SITE_URL = "https://nebulagenczeka.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Keyword first, brand second. The old default led with the brand name —
    // a name nobody is searching for yet — and buried "yapay zeka" past the
    // ~60 characters Google actually renders. The phrase a parent types is
    // "çocuklar için yapay zeka kursu", so that is what the blue line says;
    // the tagline still does the persuading, one line lower, in the
    // description and in the OG card.
    default: "Çocuklar İçin Yapay Zeka Kursu (10–18 Yaş) | Nebula Genç Zeka",
    template: "%s · Nebula Genç Zeka",
  },
  // The snippet under the title. ~155 characters, because Google truncates
  // past roughly that on desktop: the offer, the concrete proof, and the
  // thing that makes someone click rather than scroll — all before the cut.
  description:
    "10–18 yaş için birebir ve canlı yapay zeka dersleri. Çocuğunuz her derste gerçek bir iş üretiyor: web sitesi, oyun, görsel, şarkı, kısa film. İlk ders ücretsiz.",
  applicationName: "Nebula Genç Zeka",
  keywords: [
    "çocuklar için yapay zeka kursu",
    "çocuklara yapay zeka eğitimi",
    "gençler için yapay zeka kursu",
    "online yapay zeka kursu",
    "canlı yapay zeka dersi",
    "birebir yapay zeka eğitimi",
    "10-18 yaş yapay zeka",
    "yapay zeka ile görsel üretme",
    "çocuklar için prompt eğitimi",
    "yapay zeka akademisi",
    "Nebula Genç Zeka",
  ],
  category: "education",
  authors: [{ name: "Fatih Böke", url: SITE_URL }],
  creator: "Fatih Böke",
  publisher: "Nebula Genç Zeka",
  // Turkish phone numbers in body copy were getting auto-linked by Safari,
  // which rewrites them into <a href="tel:"> and breaks the hydration match.
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "Nebula Genç Zeka",
    title: "Çocuğunuz yapay zekayı izlemesin, kullansın.",
    description:
      "10–18 yaş için canlı, birebir yapay zeka akademisi. Her ders bitmiş bir işle bitiyor. İlk ders ücretsiz.",
    // 1200x630 JPEG, ~52KB. The previous card was a 1.1MB 2048x1024 PNG:
    // WhatsApp — where nearly every link to this site actually gets pasted —
    // drops preview images over a few hundred KB and falls back to showing
    // the bare URL, so the card never rendered where it mattered most.
    images: [{ url: "/brand/og-card.jpg", width: 1200, height: 630, alt: "Nebula Genç Zeka" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Çocuklar için yapay zeka kursu — Nebula Genç Zeka",
    description:
      "10–18 yaş için canlı, birebir yapay zeka akademisi. Çocuğunuz yapay zekayı izlemesin, kullansın.",
    images: ["/brand/og-card.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    // Without max-image-preview:large, Google shows this site's cards as a
    // thumbnail; with it, results and Discover get the full-width image.
    // max-snippet:-1 stops it from clipping the description we just wrote.
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Search Console's HTML-tag verification, when the property is claimed.
  // Absent env var → no tag, exactly as before.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  // NOTE: `alternates.canonical` is deliberately NOT set here. Metadata is
  // inherited by every child route, so a canonical on the root layout pointed
  // /eserler, /blog, every blog post and both legal pages at the homepage —
  // telling Google they were duplicates and to index the homepage instead.
  // Each public page now declares its own via lib/seo.tsx → canonical().
};

export const viewport: Viewport = {
  themeColor: "#0e1011",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      // Next.js 16 stopped auto-overriding a globally-set `scroll-behavior:
      // smooth` (globals.css sets it) during SPA route transitions — this
      // attribute opts back into that override so client-side navigation
      // still lands instantly instead of racing/fighting the CSS smooth
      // animation. See node_modules/next/dist/docs/.../version-16.md
      // "Scroll Behavior Override".
      data-scroll-behavior="smooth"
      className={`${plexMono.variable} h-full antialiased`}
      // The Playground's theme boot script (app/playground/page.tsx) adds a
      // class to <html> before hydration. React keeps it — attributes are
      // never patched on hydrate — but would log a className mismatch in
      // dev. This silences that one element's attribute check, nothing more.
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
