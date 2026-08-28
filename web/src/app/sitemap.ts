import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";
import { OUTPUT_CATEGORIES } from "@/lib/outputs";

/**
 * Generated per request rather than at build time.
 *
 * This route reads blog_posts, and the build environment has no Supabase
 * credentials — the deploy host only injects them at runtime. Prerendering it
 * therefore constructed a Supabase client with an undefined URL and threw
 * "supabaseUrl is required", which fails the whole build (a sitemap error is
 * fatal to `next build`, not a warning).
 *
 * A crawler hits this file rarely, so one query per request costs nothing,
 * and it has the side benefit that a newly published post shows up
 * immediately instead of waiting out a revalidation window.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/eserler`, changeFrequency: "monthly", priority: 0.7 },
    ...OUTPUT_CATEGORIES.map((c) => ({
      url: `${siteConfig.url}/eserler/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${siteConfig.url}/kvkk`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/gizlilik`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Belt and braces: the static routes must still be served even if Supabase
  // is unreachable or unconfigured. A sitemap missing its posts is
  // recoverable; one that 500s tells crawlers the whole file is broken.
  let posts: MetadataRoute.Sitemap = [];
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      const { data } = await createPublicClient()
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      posts = (data ?? []).map((post) => ({
        url: `${siteConfig.url}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at ?? post.published_at ?? Date.now()),
        changeFrequency: "monthly",
        priority: 0.6,
      }));
    }
  } catch {
    // Fall through with the static routes only.
  }

  return [...staticRoutes, ...posts];
}
