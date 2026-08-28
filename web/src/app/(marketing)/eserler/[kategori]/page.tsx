import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClosingCta } from "@/components/landing/closing-cta";
import { ContactCtas } from "@/components/landing/contact-ctas";
import { OUTPUT_ART } from "@/components/landing/output-art";
import { OUTPUT_CATEGORIES, findOutputCategory, type OutputCategory, type StudentWork } from "@/lib/outputs";

/**
 * One page per output, opened from the bento card of the same name.
 *
 * The homepage promises six concrete things a student walks out with. This is
 * where that promise is either kept or exposed: the page shows the work
 * students actually handed in, or says plainly that the first pieces aren't in
 * yet. No stock samples, no renders of what a piece "could" look like.
 *
 * Fully static — the six params are known at build time and nothing here
 * touches a database.
 */

interface PageProps {
  params: Promise<{ kategori: string }>;
}

export function generateStaticParams() {
  return OUTPUT_CATEGORIES.map((c) => ({ kategori: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kategori } = await params;
  const category = findOutputCategory(kategori);

  // Bare title only — the root layout's template appends the brand.
  if (!category) return { title: "Sayfa bulunamadı", robots: { index: false, follow: true } };

  const cover = category.works[0]?.image;
  return {
    title: category.pageTitle,
    description: category.lead,
    openGraph: {
      title: category.pageTitle,
      description: category.lead,
      ...(cover ? { images: [{ url: cover.src }] } : {}),
    },
  };
}

function WorkCard({ work, category }: { work: StudentWork; category: OutputCategory }) {
  return (
    <article
      className="nb-card"
      style={
        {
          "--tone": category.tone,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        } as React.CSSProperties
      }
    >
      <div
        style={{
          background: category.panel,
          borderBottom: "var(--stroke) solid var(--stroke-color)",
          padding: "22px 22px 24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Image
          src={work.image.src}
          alt={work.image.alt}
          width={work.image.width}
          height={work.image.height}
          sizes="(max-width: 720px) 90vw, 420px"
          style={{
            width: "100%",
            height: "auto",
            maxWidth: 380,
            borderRadius: 10,
            // The piece is the subject; the tinted panel is its mat board.
            filter: "drop-shadow(0 10px 20px rgba(21,35,67,.18))",
          }}
        />
      </div>

      <div style={{ padding: "20px 22px 24px", display: "grid", gap: 9 }}>
        <span className="nb-eyebrow" style={{ color: category.tone }}>
          {work.student}
        </span>
        <h2 className="nb-h3">{work.title}</h2>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
          {work.note}
        </p>

        {/* The lesson it came out of. A parent's next question after "who made
            this?" is "what does a lesson look like?", and the answer is one
            still away rather than a paragraph. Faces are blurred in the file
            itself, and the caption says so — that is also the site's policy,
            stated where it is being followed. */}
        {work.lesson && (
          <figure style={{ margin: "6px 0 0" }}>
            <Image
              src={work.lesson.src}
              alt={work.lesson.alt}
              width={work.lesson.width}
              height={work.lesson.height}
              sizes="(max-width: 720px) 90vw, 380px"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 8,
                border: "2px solid var(--stroke-color)",
              }}
            />
            <figcaption
              style={{
                marginTop: 7,
                fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: "var(--ink-soft)",
              }}
            >
              Ders anından. Öğrencilerimizin yüzlerini yayınlamıyoruz.
            </figcaption>
          </figure>
        )}
      </div>
    </article>
  );
}

function EmptyState({ category }: { category: OutputCategory }) {
  const Art = OUTPUT_ART[category.slug];

  return (
    <div
      className="nb-card"
      style={
        {
          "--tone": category.tone,
          padding: "clamp(24px,3.4vw,38px)",
          display: "grid",
          gap: 18,
          justifyItems: "start",
          maxWidth: 720,
        } as React.CSSProperties
      }
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 380,
          height: 190,
          background: category.panel,
          border: "var(--stroke) solid var(--stroke-color)",
          borderRadius: "var(--radius-card)",
        }}
        aria-hidden
      >
        <Art />
      </div>
      <h2 className="nb-h3">Bu çıktının ilk işleri yolda.</h2>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.62, color: "var(--ink-soft)" }}>
        Buraya yalnızca öğrencilerin gerçekten bitirdiği işleri koyuyoruz; hazır örnek
        koymuyoruz. Yeni bitenler burada olacak. Dilerseniz diğer çıktılara bakın ya da
        ücretsiz deneme dersinde çocuğunuz ilkini yapsın.
      </p>
      <ContactCtas variant="trial" />
    </div>
  );
}

export default async function OutputCategoryPage({ params }: PageProps) {
  const { kategori } = await params;
  const category = findOutputCategory(kategori);

  // An unknown slug must answer 404 rather than a 200 page that says so.
  if (!category) notFound();

  const others = OUTPUT_CATEGORIES.filter((c) => c.slug !== category.slug);

  return (
    <div data-navtheme="light">
      <section className="nb-section nb-paper" style={{ paddingTop: "clamp(112px,13vw,156px)" }}>
        <div className="nb-wrap">
          <Link
            href="/#ne-uretiyor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 26,
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
              fontSize: 12.5,
              letterSpacing: ".04em",
              color: "var(--ink-soft)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            NE ÜRETİYOR
          </Link>

          <div className="nb-measure" style={{ marginBottom: "clamp(32px,4.4vw,50px)" }}>
            <div className="nb-eyebrow" style={{ marginBottom: 18, color: category.tone }}>
              {category.no} — {category.title.toLocaleUpperCase("tr-TR")}
            </div>
            <h1 className="nb-h2" style={{ marginBottom: 18 }}>
              {category.pageTitle}
            </h1>
            <p className="nb-lead">{category.lead}</p>
          </div>

          {category.works.length > 0 ? (
            <div
              // auto-fit with a capped track and a centred row: the gallery
              // starts at one piece per category, and a lone left-aligned card
              // in a 1180px container reads as a page that failed to load
              // rather than a page with one piece on it.
              style={{
                display: "grid",
                gap: "clamp(16px,2vw,22px)",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 360px))",
                justifyContent: "center",
                alignItems: "start",
              }}
            >
              {category.works.map((work) => (
                <WorkCard key={work.slug} work={work} category={category} />
              ))}
            </div>
          ) : (
            <EmptyState category={category} />
          )}

          <div style={{ marginTop: "clamp(44px,5vw,64px)" }}>
            <div className="nb-eyebrow" style={{ marginBottom: 16 }}>
              DİĞER ÇIKTILAR
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/eserler/${o.slug}`}
                  className="nb-chip"
                  style={{ textDecoration: "none", color: "var(--ink)" }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: o.panel,
                      border: "1.5px solid var(--stroke-color)",
                    }}
                  />
                  {o.title}
                </Link>
              ))}
              <Link
                href="/eserler"
                className="nb-chip"
                style={{ textDecoration: "none", color: "var(--ink)" }}
              >
                Hepsi
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ClosingCta />
    </div>
  );
}
