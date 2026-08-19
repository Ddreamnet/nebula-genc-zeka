import { CosmicBackground } from "@/components/site/cosmic-background";
import { landingFontClass } from "@/lib/landing-fonts";

/**
 * Playground now runs on "Kâğıt Uzay" like the rest of the product, on its
 * space side (.pg-theme in globals.css) rather than the panels' paper side.
 *
 * Space Grotesk / Manrope / JetBrains Mono used to be loaded here for the old
 * "Cosmic Intellectual Horizon" theme — three faces this route was the only
 * consumer of. They are gone: the type is Fredoka + Nunito + Plex Mono, the
 * same pair every other surface uses, and the first two come from the shared
 * landing-fonts module so next/font dedupes them across the app.
 */
export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    // display: contents — this only needs to expose the theme and the font CSS
    // variables to descendants, not introduce a box in the layout tree.
    <div className={`${landingFontClass} pg-theme contents`}>
      <CosmicBackground />
      {children}
    </div>
  );
}
