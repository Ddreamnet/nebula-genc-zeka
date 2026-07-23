import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CosmicBackground } from "@/components/site/cosmic-background";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
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
    "10–16 yaş için canlı, uygulamalı yapay zeka akademisi. En fazla 2 kişilik gruplar, her derste gerçek bir üretim: gelişmiş prompting, görsel ve video üretimi.",
  applicationName: "Nebula Genç Zeka",
  keywords: [
    "çocuklar için yapay zeka",
    "yapay zeka kursu",
    "AI eğitimi",
    "prompting",
    "genç zeka",
    "10-16 yaş yapay zeka",
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
      "10–16 yaş için canlı, uygulamalı yapay zeka akademisi. En fazla 2 kişilik gruplar, her derste gerçek bir üretim.",
    images: [{ url: "/brand/nebula-lockup.png", width: 2048, height: 1024, alt: "Nebula Genç Zeka" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nebula Genç Zeka",
    description:
      "10–16 yaş için canlı, uygulamalı yapay zeka akademisi. Çocuğunuz yapay zekayı izlemesin, kullansın.",
    images: ["/brand/nebula-lockup.png"],
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
      className={`${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <CosmicBackground />
        {children}
      </body>
    </html>
  );
}
