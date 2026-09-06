import type { Metadata } from "next";
import { SkyBackground } from "@/components/playground/sky-background";
import { landingFontClass } from "@/lib/landing-fonts";

/**
 * Playground runs on "Kâğıt Uzay" like the rest of the product — and now on
 * its paper side, not the space side: a light blue dotted sheet (.pg-theme in
 * globals.css) rather than the navy star field it opened on.
 *
 * Space Grotesk / Manrope / JetBrains Mono used to be loaded here for the old
 * "Cosmic Intellectual Horizon" theme — three faces this route was the only
 * consumer of. They are gone: the type is Fredoka + Nunito + Plex Mono, the
 * same pair every other surface uses, and the first two come from the shared
 * landing-fonts module so next/font dedupes them across the app.
 */
/**
 * Belt-and-braces noindex for everything behind the login.
 *
 * robots.txt already disallows this whole subtree, but a Disallow only stops
 * the crawl — Google will still list a URL it finds linked from elsewhere,
 * with no snippet ("A description for this result is not available"). The
 * meta tag is what actually keeps it out. Both are cheap; the failure modes
 * they cover are different.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    // display: contents — this only needs to expose the theme and the font CSS
    // variables to descendants, not introduce a box in the layout tree.
    <div className={`${landingFontClass} pg-theme contents`}>
      <SkyBackground />
      {children}
    </div>
  );
}
