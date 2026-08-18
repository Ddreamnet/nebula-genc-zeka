import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

/** Re-query blog posts at most hourly; the static routes never change. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/kvkk`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/gizlilik`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // A failed query must not take the whole sitemap down with it — a sitemap
  // missing its posts is recoverable, a 500 tells crawlers the file is broken.
  const { data } = await createPublicClient()
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const posts: MetadataRoute.Sitemap = (data ?? []).map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at ?? post.published_at ?? Date.now()),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
