import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Web app manifest.
 *
 * Two reasons it exists, both search-facing rather than app-facing: Lighthouse
 * scores its absence against the site, and Android Chrome uses `name` +
 * `theme_color` for the "add to home screen" card a parent gets after visiting
 * a few times. The icons are the same files app/icon.png and app/apple-icon.png
 * already serve — Next fingerprints and caches them either way.
 *
 * `display: "browser"` on purpose: this is a marketing site plus a login, not
 * an installable app, and "standalone" would strip the address bar off the
 * student panel where a URL is genuinely useful.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — Çocuklar için Yapay Zeka Kursu`,
    short_name: siteConfig.shortName,
    description:
      "10–18 yaş için birebir ve canlı yapay zeka dersleri. Her derste gerçek bir üretim.",
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#FFFBF2",
    theme_color: "#0e1011",
    categories: ["education", "kids"],
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
