import type { Metadata } from "next";
import localFont from "next/font/local";
import { PanelThemeScope } from "@/components/site/panel-theme-scope";
import { landingFontClass } from "@/lib/landing-fonts";

/**
 * The Playground is a room in the same building as the panels: it wears
 * `.panel-theme` — the cream-card, navy-bar "Kâğıt Uzay v2" language the
 * dashboards use — and the same two faces (Fredoka + Nunito, via the shared
 * landing-fonts module so next/font dedupes them). Nothing here is loaded
 * that the dashboard has not already loaded, which is most of why moving
 * between the two feels instant: same CSS, same fonts, only the route chunk
 * changes hands.
 *
 * It used to be its own theme (`.pg-theme`, a cut-paper sheet on a dotted
 * sky) with its own fixed background layer. That is gone: one design system,
 * one flat ground, no extra layer to paint on every scroll.
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

/**
 * The greeting face. Brixela is loaded here and nowhere else — next/font
 * preloads whatever a layout applies, and only the empty stage's one line
 * ("Merhaba, ne üretiyoruz?", see components/playground/stage.tsx) uses it.
 * `display: block` rather than swap: the file is 5 KB and preloaded, so it
 * is there for the first paint in practice, and a swap from Nunito mid-
 * entrance would be the one visible jank on the page. The file is a
 * derivative of the vendor's demo with the Turkish letters and punctuation
 * the greeting needs — see src/fonts/BRIXELA-LICENSE.txt before shipping.
 */
const brixela = localFont({
  src: "../../fonts/brixela-nebula.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-brixela",
  display: "block",
});

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`panel-theme panel-grid-bg bg-surface font-sans text-on-surface ${landingFontClass} ${brixela.variable}`}>
      {/* Portals (the model picker, the viewer, the avatar menu) render as
          children of <body>, outside this div — the scope puts the same
          classes on <body> so they inherit the theme too. */}
      <PanelThemeScope />
      {children}
    </div>
  );
}
