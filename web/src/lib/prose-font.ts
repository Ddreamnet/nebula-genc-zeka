import { Archivo } from "next/font/google";

/**
 * Archivo Black-weight, the editorial face used for the <h1> on the blog and
 * the legal/prose pages — and nowhere else in the product.
 *
 * It lives here, in a module those three files import, rather than in the root
 * layout. next/font emits a `<link rel="preload">` for every face a route
 * actually pulls in, and the root layout wraps EVERY route — so declaring it
 * there made the homepage, the login page, the dashboard and the playground
 * all preload Archivo before their own critical CSS, to render exactly zero
 * characters in it. Scoping it to the routes that use it removes those
 * preloads from every other page.
 *
 * Only weight 900 is loaded because only weight 900 is ever asked for (all
 * three call sites set `fontWeight: 900`); 700 and 800 used to be downloaded
 * alongside it and were never drawn.
 */
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["900"],
  variable: "--font-archivo",
  display: "swap",
});
