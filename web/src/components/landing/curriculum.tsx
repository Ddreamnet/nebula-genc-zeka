import { Reveal } from "@/components/ui/reveal";
import { Nova } from "@/components/cast/nova";
import { Star, NovaSays } from "@/components/cast/props";
import { WebArt, AvatarArt, OyunArt, AfisArt, MuzikArt, VideoArt } from "./output-art";

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
 */

type Card = {
  span: string;
  no: string;
  title: string;
  desc: string;
  panel: string;
  tone: string;
  ink: string;
  art: React.ReactNode;
};

const CARDS: Card[] = [
  {
    span: "span-4",
    no: "ÇIKTI 01",
    title: "Kendi web sitesi",
    desc: "Aklındaki fikri anlatıyor, sitesi çıkıyor. Sonra linki sınıf grubuna atıyor.",
    panel: "#DCD2FF",
    tone: "var(--violet-deep)",
    ink: "var(--violet-deep)",
    art: <WebArt />,
  },
  {
    span: "span-2",
    no: "ÇIKTI 02",
    title: "Konuşan 3D avatar",
    desc: "Karakteri o çiziyor, sesi o veriyor. Karakter ekranda konuşuyor.",
    panel: "#C6F1DC",
    tone: "var(--mint-deep)",
    ink: "var(--mint-deep)",
    art: <AvatarArt />,
  },
  {
    span: "span-2",
    no: "ÇIKTI 03",
    title: "Oyun",
    desc: "Kuralları o koyuyor. Sonunda arkadaşı oturup oynuyor.",
    panel: "#FFD6DE",
    tone: "var(--coral-deep)",
    ink: "var(--coral-deep)",
    art: <OyunArt />,
  },
  {
    span: "span-2",
    no: "ÇIKTI 04",
    title: "Afiş & görsel",
    desc: "Odasına asacak kalitede afişler. Baskıya hazır çıkıyor.",
    panel: "#FFE1C4",
    tone: "var(--amber-deep)",
    ink: "var(--amber-deep)",
    art: <AfisArt />,
  },
  {
    span: "span-2",
    no: "ÇIKTI 05",
    title: "Müzik & şarkı",
    desc: "Sözü onun, melodisi onun. Telefonda çalınabilecek bir parça.",
    panel: "#D3DCFB",
    tone: "var(--blue-deep)",
    ink: "var(--blue-deep)",
    art: <MuzikArt />,
  },
  {
    span: "span-6",
    no: "ÇIKTI 06",
    title: "Video & kısa film",
    desc: "Senaryodan kurguya kadar hepsi onun. Sonunda izlenecek bir kısa film.",
    panel: "#FFEBCF",
    tone: "var(--amber-deep)",
    ink: "var(--amber-deep)",
    art: <VideoArt />,
  },
];

function OutputCard({ card, wide, delay }: { card: Card; wide: boolean; delay: number }) {
  return (
    <Reveal className={card.span} delay={delay} style={{ height: "100%" }}>
      <article
        className="nb-card nb-card--live"
        style={
          {
            "--tone": card.tone,
            height: "100%",
            display: wide ? "grid" : "flex",
            gridTemplateColumns: wide ? "minmax(0,1.4fr) minmax(0,1fr)" : undefined,
            flexDirection: wide ? undefined : "column",
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
          {card.art}
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
          <span className="nb-eyebrow" style={{ color: card.ink }}>
            {card.no}
          </span>
          <h3 className="nb-h3">{card.title}</h3>
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.5, margin: 0 }}>
            {card.desc}
          </p>
        </div>
      </article>
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
              arkadaşına gösterilebilir altı somut çıktı.
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
          {CARDS.map((c, i) => (
            <OutputCard key={c.no} card={c} wide={c.span === "span-6"} delay={(i % 3) * 90} />
          ))}
        </div>
      </div>
    </section>
  );
}
