import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Nothing behind the login has any business in a search index, and /api/*
  // would only ever answer a crawler with 401s. Every one of these routes
  // ALSO ships `robots: { index: false }` in its layout — a Disallow stops the
  // crawl but not the listing, so the two do different jobs.
  const privateRoutes = ["/dashboard", "/playground", "/giris", "/api/"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
      {
        // Googlebot-Image needs the OG card and the student work explicitly
        // reachable — they're what shows up in image search for "çocuk yapay
        // zeka projesi", and image results carry their page with them.
        userAgent: "Googlebot-Image",
        allow: ["/brand/", "/eserler/", "/landing/"],
        disallow: privateRoutes,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
