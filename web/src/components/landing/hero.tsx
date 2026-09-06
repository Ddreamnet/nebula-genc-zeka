import Image from "next/image";
import { HERO_DECOR_HTML } from "./hero-decor";

/**
 * Hero — cream paper on the left, a shuttle flying left with its exhaust
 * plume filling the right of the frame.
 *
 * Almost all of the pixels here come from <HERO_DECOR_HTML>: the wavy clip
 * path, the plume, the warm exhaust core, the nine planets, the comets, the
 * crumbs and the shuttle, lifted verbatim from the design handoff. What this
 * file owns is the frame those layers position against (.nb-hero) and the
 * text column that sits on top of them.
 *
 * The decor is injected inside a `display: contents` wrapper rather than a
 * real box. Every layer in it is absolutely positioned against the hero
 * frame's padding box and several read --nb-shift from it; a wrapper that
 * generated a box would become their containing block instead and shift the
 * whole field by the frame's own padding.
 */
export function Hero() {
  return (
    <section
      id="top"
      data-navtheme="light"
      className="nb-scale"
      style={
        {
          position: "relative",
          overflow: "hidden",
          background: "#FFFBF2",
          color: "var(--ink)",
          // The hero is drawn 20% down from the handoff's own scale, the rest
          // of the page 10% (see page.tsx). The section carries the zoom, not
          // the .nb-hero frame inside it, so the band's own height comes down
          // with its contents instead of leaving a stripe of bare cream.
          "--nb-scale": 0.8,
        } as React.CSSProperties
      }
    >
      <div className="nb-hero">
        <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: HERO_DECOR_HTML }} />

        {/* Text column. The wordmark is the page's identity here — which is
            why the header hides its own logo while the hero is in view — and
            the paragraph sits at the bottom of the same column, so the two
            bracket the cream field instead of clumping at the top. */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            flex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "clamp(28px,4vw,56px)",
          }}
        >
          {/* The page's <h1>.
              The homepage had none at all: the hero's identity is the wordmark
              artwork, and an <img> is not a heading — so the single strongest
              on-page signal Google has was simply missing, and the document
              outline started at the <h2> of the second section.

              The element wraps the artwork instead of replacing it, so nothing
              moves by a pixel: the heading box is the same flex column that was
              here before, the visible text is the wordmark image exactly as
              drawn, and the machine-readable text is the sr-only span. The
              image's alt is empty because the span already names the same
              thing — with both, a screen reader would read the brand twice. */}
          <h1
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              margin: 0,
              font: "inherit",
            }}
          >
            <span className="sr-only">
              Nebula Genç Zeka — 10–18 yaş çocuklar ve gençler için canlı, birebir yapay zeka kursu
            </span>
            <Image
              src="/landing/logo-black.png"
              alt=""
              width={1024}
              height={512}
              priority
              // The two breakpoints are where the clamp() below stops moving:
              // 26vw hits its 215px floor at 827px and its 430px ceiling at
              // 1654px. Without a `sizes`, next/image assumes this wordmark is
              // viewport-wide and ships a 2048px-wide render of it for a box
              // that is never more than 430px across.
              sizes="(max-width: 827px) 215px, (min-width: 1654px) 430px, 26vw"
              style={{ display: "block", width: "clamp(215px,26vw,430px)", height: "auto" }}
            />
          </h1>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "clamp(16px,1.9vw,28px)",
              // Not a max-width: the column has to hold this exact width so
              // the paragraph never runs under the plume's edge, which is
              // itself placed as a percentage of the same frame.
              width: "clamp(230px,27.5vw,440px)",
            }}
          >
            <p
              style={{
                fontSize: "clamp(15px,1.25vw,19px)",
                lineHeight: 1.72,
                color: "var(--ink-soft)",
                textWrap: "pretty",
                margin: 0,
              }}
            >
              Canlı yapay zeka kullanımı eğitimi. Her ders bitmiş bir ürünle bitiyor: bir web
              sitesi, oynanabilir bir oyun, kendi şarkısı, kendi kısa filmi.
            </p>

            <a
              href="#ne-uretiyor"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
                whiteSpace: "nowrap",
                color: "var(--ink)",
              }}
            >
              {/* A bare chevron: two strokes meeting at a point, no baseline
                  and no circle around it. */}
              <svg
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden
                style={{
                  width: "clamp(20px,1.8vw,26px)",
                  height: "auto",
                  flexShrink: 0,
                  color: "var(--coral-deep)",
                }}
              >
                <path
                  d="M5 9.5 L14 19 L23 9.5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {/* The handoff sets this in Nasalization, which is not a Google
                  font and is not bundled with the project; it names Fredoka
                  as the accepted fallback, which is what renders today. */}
              <span
                style={{
                  fontFamily: "Nasalization, var(--font-fredoka), ui-sans-serif, sans-serif",
                  fontSize: "clamp(13px,1.11vw,17px)",
                  letterSpacing: ".1em",
                }}
              >
                Aşağı kaydır
              </span>
            </a>
          </div>
        </div>

        {/* Bottom seam: a flat band of --paper that hands the page over to the
            section below. Straight rather than the torn .nb-seam primitive —
            the plume now runs all the way to the frame's edge, and a second
            wavy edge under it read as two curves competing. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "clamp(30px,4.6%,64px)",
            background: "var(--paper)",
            zIndex: 3,
          }}
        />
      </div>
    </section>
  );
}
