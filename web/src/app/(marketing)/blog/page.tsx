import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClosingCta } from "@/components/landing/closing-cta";
import { archivo } from "@/lib/prose-font";
import { JsonLd, absoluteUrl, breadcrumbLd, canonical, openGraphFor } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog — Çocuklar ve Yapay Zeka",
  description:
    "Velilere yönelik yazılar: çocuklar yapay zekayı nasıl güvenle kullanır, hangi araçlar hangi yaşa uygun, evde neler denenebilir.",
  alternates: canonical("/blog"),
  openGraph: openGraphFor({
    title: "Blog — çocuklar ve yapay zeka",
    description:
      "Velilere yönelik yazılar: çocuklar yapay zekayı nasıl güvenle kullanır, hangi araçlar hangi yaşa uygun, evde neler denenebilir.",
    path: "/blog",
  }),
};

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div className={archivo.variable} style={{ background: "var(--paper)", minHeight: "100vh" }}>
      {/* Blog + breadcrumb. The post list is included so a crawler that lands
          here has every published URL in the markup as well as in the sitemap. */}
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Ana sayfa", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            "@id": absoluteUrl("/blog"),
            name: `${siteConfig.name} Blog`,
            description:
              "Çocuklar, gençler ve yapay zeka üzerine velilere yönelik yazılar.",
            inLanguage: "tr-TR",
            publisher: { "@id": `${siteConfig.url}/#organization` },
            blogPost: (posts ?? []).map((post) => ({
              "@type": "BlogPosting",
              "@id": absoluteUrl(`/blog/${post.slug}`),
              headline: post.title,
              url: absoluteUrl(`/blog/${post.slug}`),
              datePublished: post.published_at ?? undefined,
            })),
          },
        ]}
      />
      <main style={{ paddingTop: "clamp(96px,12vw,140px)", paddingBottom: 80, paddingInline: "clamp(18px,5vw,64px)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 900,
              letterSpacing: "-.02em",
              fontSize: "clamp(2rem,5vw,3.2rem)",
              color: "var(--navy)",
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            Blog
          </h1>

          {!posts || posts.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "60px 0" }}>Henüz yayınlanmış yazı yok.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  style={{
                    background: "var(--paper2)",
                    border: "1px solid #d8cbae",
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    textDecoration: "none",
                    transition: "transform .15s ease",
                  }}
                >
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={`${post.title} — kapak görseli`}
                      // Covers are pasted as arbitrary URLs in the admin
                      // editor, so they can't go through next/image (that
                      // would mean allowlisting every host, or `**`). These
                      // four attributes are what next/image would have added
                      // anyway: intrinsic size so the card reserves its box
                      // before the bytes land (CLS), and lazy+async so a
                      // twelve-post grid doesn't block the first paint.
                      width={640}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "auto", aspectRatio: "16/10", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        aspectRatio: "16/10",
                        background: "linear-gradient(135deg, rgba(61,95,224,.25), rgba(21,35,67,.15))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 40,
                      }}
                    >
                      📝
                    </div>
                  )}
                  <div style={{ padding: 18 }}>
                    {post.published_at && (
                      <p style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
                        {new Date(post.published_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    <h2 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 6, lineHeight: 1.3 }}>{post.title}</h2>
                    {post.excerpt && (
                      <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {post.excerpt}
                      </p>
                    )}
                    <span style={{ fontFamily: "var(--font-plex-mono)", fontSize: 13, color: "var(--amber-dark)", marginTop: 10, display: "inline-block" }}>
                      Devamını oku →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <ClosingCta />
    </div>
  );
}
