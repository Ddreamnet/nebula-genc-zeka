import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Nova } from "@/components/cast/nova";
import { Star, NovaSays } from "@/components/cast/props";
import { OUTPUT_ART } from "./output-art";
import { OUTPUT_CATEGORIES, type OutputCategory } from "@/lib/outputs";

/**
 * The six outputs, as a bento.
 *
 * Each card carries its own accent — panel tint, hard shadow, and eyebrow all
 * keyed to one hue — so the row reads as six different things rather than six
 * instances of one template. That's the whole job of this section: the claim
 * is "six concrete outputs", and six identical cards quietly argue the
 * opposite.
 *
 * The copy carries the same rule. Four of the six descriptions used to run on
 * the identical three-verb skeleton ("X yazıyor, Y tasarlıyor, Z yayınlıyor"),
 * which undid in words what the tints and shadows do in pixels. Each one now
 * lands on a different beat, and each ends where a parent actually sees the
 * result: the class group chat, a friend playing it, the wall of their room.
 *
 * Every card is a link into /eserler/<slug>, where that output's real student
 * work lives. The section asserts "bunları çocuklar yaptı"; the pages behind
 * these cards are where that stops being an assertion. Copy and colours come
 * from lib/outputs.ts so the card and the page it opens stay one thing.
 */

function OutputCard({ card, wide, delay }: { card: OutputCategory; wide: boolean; delay: number }) {
  const Art = OUTPUT_ART[card.slug];

  return (
    <Reveal className={card.span} delay={delay} style={{ height: "100%" }}>
      <Link
        href={`/eserler/${card.slug}`}
        className="nb-card nb-card--live"
        style={
          {
            "--tone": card.tone,
            height: "100%",
            display: wide ? "grid" : "flex",
            gridTemplateColumns: wide ? "minmax(0,1.4fr) minmax(0,1fr)" : undefined,
            flexDirection: wide ? undefined : "column",
            color: "inherit",
            textDecoration: "none",
          } as React.CSSProperties
        }
      >
        <div
          style={{
            position: "relative",
            background: card.panel,
            borderBottom: wide ? undefined : "var(--stroke) solid var(--stroke-color)",
            borderRight: wide ? "var(--stroke) solid var(--stroke-color)" : undefined,
            minHeight: wide ? 168 : 148,
            // Grid stretches every card in a row to the tallest one. Letting
            // the panel absorb that slack keeps the art centred instead of
            // pushing dead space under the shorter card's text.
            flex: wide ? undefined : 1,
          }}
        >
          <Art />
        </div>

        <div
          style={{
            padding: "18px 20px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <span className="nb-eyebrow" style={{ color: card.tone }}>
            {card.no}
          </span>
          <h3 className="nb-h3">{card.title}</h3>
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.5, margin: 0 }}>
            {card.desc}
          </p>
          {/* The affordance. Without it the cards read as a static grid and
              nobody finds out the work is one tap away. */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
              fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
              fontWeight: 500,
              fontSize: 14.5,
              color: card.tone,
            }}
          >
            Öğrencilerin işlerini gör
            <ArrowRight size={16} strokeWidth={2.75} />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

export function Curriculum() {
  return (
    <section id="ne-uretiyor" data-navtheme="light" className="nb-section nb-paper">
      <div className="nb-wrap">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 32,
            marginBottom: "clamp(38px,5vw,58px)",
          }}
        >
          <div className="nb-measure">
            <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
              01 — NE ÜRETİYOR
            </div>
            <h2 className="nb-h2" style={{ marginBottom: 18 }}>
              Ders bitince elinde
              <br />
              gerçek bir şey kalıyor.
            </h2>
            <p className="nb-lead" style={{ maxWidth: 560 }}>
              Soyut bir &ldquo;yapay zeka farkındalığı&rdquo; değil. Yayınlanabilir, paylaşılabilir,
              arkadaşına gösterilebilir altı somut çıktı. Her kartın altında o çıktıdan
              öğrencilerin yaptıkları var.
            </p>
          </div>

          {/* Nova points at the grid — the section's own subject, not decoration.
              Her line is the one place on this section that talks to the child
              rather than the parent, and it does the job the heading can't:
              it says the six cards are other kids' work, not our samples. */}
          <div
            className="hidden lg:flex"
            style={{ position: "relative", flexShrink: 0, flexDirection: "column", alignItems: "flex-start", gap: 6 }}
            aria-hidden
          >
            <Star
              className="nb-float nb-delay-2"
              style={{ position: "absolute", width: 26, top: -6, left: -14 }}
              color="#FF9F45"
            />
            <NovaSays text="bunları çocuklar yaptı, ben değil" style={{ marginLeft: 8 }} />
            <Nova pose="point" className="nb-bob" style={{ width: 148 }} />
          </div>
        </div>

        <div className="nb-grid nb-bento">
          {OUTPUT_CATEGORIES.map((c, i) => (
            <OutputCard key={c.slug} card={c} wide={c.span === "span-6"} delay={(i % 3) * 90} />
          ))}
        </div>
      </div>
    </section>
  );
}
