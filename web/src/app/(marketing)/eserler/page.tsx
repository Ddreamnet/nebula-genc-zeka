import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClosingCta } from "@/components/landing/closing-cta";
import { OUTPUT_ART } from "@/components/landing/output-art";
import { OUTPUT_CATEGORIES } from "@/lib/outputs";

/**
 * Index of the six output pages.
 *
 * The homepage bento is the main way in; this page exists so the category
 * pages have somewhere to point back to besides the homepage anchor, and so
 * the whole set is one crawlable URL rather than six leaves hanging off a
 * fragment link.
 */

export const metadata: Metadata = {
  title: "Öğrencilerin işleri",
  description:
    "Nebula Genç Zeka öğrencilerinin derslerde ürettiği işler: web siteleri, karakterler, oyunlar, afişler, şarkılar ve kısa filmler.",
};

export default function EserlerPage() {
  return (
    <div data-navtheme="light">
      <section className="nb-section nb-paper" style={{ paddingTop: "clamp(112px,13vw,156px)" }}>
        <div className="nb-wrap">
          <div className="nb-measure" style={{ marginBottom: "clamp(32px,4.4vw,50px)" }}>
            <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
              ÖĞRENCİLERİN İŞLERİ
            </div>
            <h1 className="nb-h2" style={{ marginBottom: 18 }}>
              Altı çıktı, hepsi çocukların elinden.
            </h1>
            <p className="nb-lead">
              Her ders bitmiş bir işle bitiyor. Aşağıdaki altı başlıktan birine girin, o
              başlıkta öğrencilerin neler yaptığını görün.
            </p>
          </div>

          <div className="nb-grid nb-grid--3">
            {OUTPUT_CATEGORIES.map((c) => {
              const Art = OUTPUT_ART[c.slug];
              return (
                <Link
                  key={c.slug}
                  href={`/eserler/${c.slug}`}
                  className="nb-card nb-card--live"
                  style={
                    {
                      "--tone": c.tone,
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      color: "inherit",
                      textDecoration: "none",
                    } as React.CSSProperties
                  }
                >
                  <div
                    style={{
                      position: "relative",
                      minHeight: 150,
                      background: c.panel,
                      borderBottom: "var(--stroke) solid var(--stroke-color)",
                    }}
                  >
                    <Art />
                  </div>
                  <div style={{ padding: "18px 20px 20px", display: "grid", gap: 7 }}>
                    <span className="nb-eyebrow" style={{ color: c.tone }}>
                      {c.no}
                    </span>
                    <h2 className="nb-h3">{c.title}</h2>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                      {c.works.length > 0
                        ? `${c.works.length} iş yayında`
                        : "İlk işler yolda"}
                    </p>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                        fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
                        fontWeight: 500,
                        fontSize: 14.5,
                        color: c.tone,
                      }}
                    >
                      Bak
                      <ArrowRight size={16} strokeWidth={2.75} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <ClosingCta />
    </div>
  );
}
