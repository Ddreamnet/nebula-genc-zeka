import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClosingCta } from "@/components/landing/closing-cta";
import { archivo } from "@/lib/prose-font";
import { JsonLd, blogPostingLd, breadcrumbLd, canonical, openGraphFor } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content, cover_image_url, published_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  // Bare title only — the root layout's `template` ("%s · Nebula Genç Zeka")
  // appends the brand itself. Spelling it out here too produced
  // "Yazı · Nebula Genç Zeka · Nebula Genç Zeka" in the tab and in search results.
  if (!post) return { title: "Yazı bulunamadı", robots: { index: false, follow: true } };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: canonical(`/blog/${slug}`),
    openGraph: openGraphFor({
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      path: `/blog/${slug}`,
      // The post's own cover is what people expect to see when the link is
      // pasted into WhatsApp; the site-wide lockup only stands in when a post
      // has no cover of its own.
      images: [post.cover_image_url],
      publishedTime: post.published_at ?? undefined,
      // Google reads dateModified for freshness; without it a post that gets
      // corrected keeps the age of its first publish in the results.
      modifiedTime: post.updated_at ?? post.published_at ?? undefined,
      authors: [siteConfig.founder],
    }),
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  // A missing slug must answer 404, not a 200 page that says "not found" —
  // otherwise deleted posts stay in the search index as soft-404s.
  if (!post) notFound();

  return (
    <div className={archivo.variable} style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <JsonLd
        data={[
          blogPostingLd({
            slug,
            title: post.title,
            excerpt: post.excerpt,
            coverImageUrl: post.cover_image_url,
            publishedAt: post.published_at,
            updatedAt: post.updated_at,
          }),
          breadcrumbLd([
            { name: "Ana sayfa", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${slug}` },
          ]),
        ]}
      />
      <main style={{ paddingTop: "clamp(96px,12vw,140px)", paddingBottom: 80, paddingInline: "clamp(18px,5vw,64px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {post.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_image_url}
              alt={post.title}
              // This is the LCP element on a post. Covers come from arbitrary
              // URLs typed into the admin editor, so next/image is out (it
              // would need every host allowlisted); high fetch priority plus a
              // declared intrinsic size gets most of the same win — the
              // browser requests it in the first wave instead of after the
              // fonts, and the box is reserved before it arrives.
              width={1200}
              height={675}
              fetchPriority="high"
              decoding="async"
              style={{ width: "100%", height: "auto", aspectRatio: "16/9", objectFit: "cover", borderRadius: 14, marginBottom: 32 }}
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
