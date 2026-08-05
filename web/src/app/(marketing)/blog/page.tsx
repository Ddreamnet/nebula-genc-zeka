import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClosingCta } from "@/components/landing/closing-cta";

export const metadata: Metadata = {
  title: "Blog — Nebula Genç Zeka",
  description: "Nebula Genç Zeka'dan yapay zeka, eğitim ve çocuklarla yaratıcılık üzerine yazılar.",
};

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
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
                      alt={post.title}
                      style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
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
