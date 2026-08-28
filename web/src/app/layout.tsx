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
    default: "Nebula Genç Zeka — Çocuğunuz yapay zekayı izlemesin, kullansın",
    template: "%s · Nebula Genç Zeka",
  },
  description:
    "10–18 yaş için canlı, uygulamalı yapay zeka akademisi. Birebir dersler, her derste gerçek bir üretim: gelişmiş prompting, görsel ve video üretimi.",
  applicationName: "Nebula Genç Zeka",
  keywords: [
    "çocuklar için yapay zeka",
    "yapay zeka kursu",
    "AI eğitimi",
    "prompting",
    "genç zeka",
    "10-18 yaş yapay zeka",
    "canlı yapay zeka dersi",
  ],
  authors: [{ name: "Fatih Böke" }],
  creator: "Fatih Böke",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "Nebula Genç Zeka",
    title: "Çocuğunuz yapay zekayı izlemesin, kullansın.",
    description:
      "10–18 yaş için canlı, uygulamalı yapay zeka akademisi. Birebir dersler, her derste gerçek bir üretim.",
    // 1200x630 JPEG, ~52KB. The previous card was a 1.1MB 2048x1024 PNG:
    // WhatsApp — where nearly every link to this site actually gets pasted —
    // drops preview images over a few hundred KB and falls back to showing
    // the bare URL, so the card never rendered where it mattered most.
    images: [{ url: "/brand/og-card.jpg", width: 1200, height: 630, alt: "Nebula Genç Zeka" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nebula Genç Zeka",
    description:
      "10–18 yaş için canlı, uygulamalı yapay zeka akademisi. Çocuğunuz yapay zekayı izlemesin, kullansın.",
    images: ["/brand/og-card.jpg"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
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
    >
      <body className="relative min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
