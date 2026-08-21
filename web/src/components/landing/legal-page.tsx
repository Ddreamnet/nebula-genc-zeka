import type { ReactNode } from "react";
import { archivo } from "@/lib/prose-font";

const legal = [
  { label: "KVKK", href: "/kvkk" },
  { label: "Gizlilik ve Çerezler", href: "/gizlilik" },
];

/**
 * Shared shell for legal/policy content (KVKK, Gizlilik, ...) — same paper/navy
 * marketing look, narrowed to a comfortable reading width. Section content is
 * just semantic <h2>/<p>/<ul> from the page itself, styled via .legal-prose
 * in landing.css so each page stays plain markup, no per-page inline styles.
 * No contact CTA here (that's ClosingCta, used on the homepage/blog) — just
 * a small footer. `data-navtheme="light"` on the root is required: this is the
 * only page-level content, and with no data-navtheme anywhere the navbar's
 * IntersectionObserver never fires, leaving it stuck on its initial "dark"
 * theme (light text) over this page's light paper background — invisible.
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div data-navtheme="light" className={archivo.variable} style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <main style={{ paddingTop: "clamp(96px,12vw,140px)", paddingBottom: 100, paddingInline: "clamp(18px,5vw,64px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: "var(--font-plex-mono)",
              fontSize: 12.5,
              letterSpacing: ".2em",
              color: "var(--amber-dark)",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 900,
              letterSpacing: "-.02em",
              lineHeight: 1.05,
              fontSize: "clamp(2rem,4.5vw,3rem)",
              color: "var(--navy)",
              marginBottom: 14,
              textWrap: "balance",
            }}
          >
            {title}
          </h1>
          <p style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 56 }}>
            Son güncelleme: {updated}
          </p>
          <div className="legal-prose">{children}</div>
        </div>
      </main>
      <footer
        style={{
          borderTop: "1px solid rgba(35,33,28,.12)",
          padding: "24px clamp(18px,5vw,64px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px 20px",
        }}
      >
        <span style={{ fontFamily: "var(--font-plex-mono)", fontSize: 11.5, letterSpacing: ".05em", color: "var(--ink-soft)" }}>
          © {new Date().getFullYear()} NEBULA GENÇ ZEKA
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          {legal.map((l) => (
            <a key={l.href} href={l.href} style={{ fontFamily: "var(--font-plex-mono)", fontSize: 11.5, letterSpacing: ".04em", color: "var(--ink-soft)" }}>
              {l.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
