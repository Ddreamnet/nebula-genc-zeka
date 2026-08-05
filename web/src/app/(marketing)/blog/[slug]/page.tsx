import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClosingCta } from "@/components/landing/closing-cta";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content, cover_image_url, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Yazı bulunamadı — Nebula Genç Zeka" };
  return {
    title: `${post.title} — Nebula Genç Zeka`,
    description: post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
        <main style={{ paddingTop: "clamp(96px,12vw,140px)", paddingBottom: 80, paddingInline: "clamp(18px,5vw,64px)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 20, color: "var(--ink-soft)", marginBottom: 16 }}>Yazı bulunamadı.</p>
            <Link href="/blog" style={{ color: "var(--amber-dark)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={16} /> Blog&apos;a dön
            </Link>
          </div>
        </main>
        <ClosingCta />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <main style={{ paddingTop: "clamp(96px,12vw,140px)", paddingBottom: 80, paddingInline: "clamp(18px,5vw,64px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_image_url}
              alt={post.title}
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 14, marginBottom: 32 }}
            />
          )}

          {post.published_at && (
            <p style={{ fontFamily: "var(--font-plex-mono)", fontSize: 13, color: "var(--ink-soft)", marginBottom: 8 }}>
              {new Date(post.published_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}

          <h1
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 900,
              letterSpacing: "-.02em",
              fontSize: "clamp(1.75rem,4vw,2.75rem)",
              color: "var(--navy)",
              lineHeight: 1.15,
              marginBottom: 28,
            }}
          >
            {post.title}
          </h1>

          {post.content && (
            <article
              className="blog-prose"
              style={{ color: "var(--ink)", lineHeight: 1.7, fontSize: 16 }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}

          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #d8cbae" }}>
            <Link href="/blog" style={{ color: "var(--amber-dark)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={16} /> Blog&apos;a dön
            </Link>
          </div>
        </div>
      </main>
      <ClosingCta />
    </div>
  );
}
