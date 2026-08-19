import { Fredoka, Nunito } from "next/font/google";

/**
 * The landing typeface pair, declared once and shared.
 *
 * Two trees need them: the (marketing) layout, and the dead-end pages (404 /
 * error) that render outside it under the root layout. Declaring them in both
 * places separately would load the same two faces twice; importing this module
 * lets next/font dedupe them into one request.
 *
 * They deliberately do NOT live in the root layout — next/font preloads
 * whatever a layout applies, and the root layout wraps the panels and the
 * playground too, which use neither face.
 */
export const fredoka = Fredoka({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

export const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

/** Everything the landing design system needs on a wrapper element. */
export const landingFontClass = `${fredoka.variable} ${nunito.variable}`;
