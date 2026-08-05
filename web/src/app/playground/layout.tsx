import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import { CosmicBackground } from "@/components/site/cosmic-background";

// Playground intentionally stays on the original global "Cosmic Intellectual
// Horizon" theme (never migrated to .panel-theme). These used to be declared
// in the root layout, which meant every route (including marketing/giriş/
// dashboard, which never render with them) preloaded these font files too —
// see the comment in app/layout.tsx. Scoping them to this layout means only
// /playground pays for them.
//
// CosmicBackground moved here for the same reason (was in the root layout):
// every other route (marketing/giriş/dashboard) paints a fully opaque
// background over its own content, so that fixed, animated (perpetual
// opacity twinkle), viewport-sized layer was mounted and running on every
// single page while never being visible anywhere except here.
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

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    // display: contents — this only needs to expose the font CSS variables
    // to descendants, not introduce a box in the layout tree.
    <div className={`${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} contents`}>
      <CosmicBackground />
      {children}
    </div>
  );
}
