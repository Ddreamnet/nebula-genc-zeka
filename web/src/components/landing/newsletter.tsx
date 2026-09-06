import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";

/**
 * 04 — Bülten. The weekly PDF issue that closes every lesson.
 *
 * Ground is `--tint-peach`, not `--paper`: those two differ by 4/1/0 per
 * channel, so this band has to be followed by a cool tint (05 Güven's paper)
 * or the two read as one wall. If the sections are ever reordered, that
 * pairing is the thing to preserve.
 */

/** The fan. Issue 01 is in front on the right, 02–04 receding to the left. */
const COVERS = [
  { n: "01", src: "/landing/bulten/kapak-01.png", w: 620, h: 878, left: "48%", tilt: "6deg", z: 4 },
  { n: "02", src: "/landing/bulten/kapak-02.png", w: 720, h: 1019, left: "32%", tilt: "1deg", z: 3 },
  { n: "03", src: "/landing/bulten/kapak-03.png", w: 620, h: 878, left: "16%", tilt: "-4deg", z: 2 },
  { n: "04", src: "/landing/bulten/kapak-04.png", w: 620, h: 878, left: "0%", tilt: "-9deg", z: 1 },
] as const;

const STATS = [
  { fill: "var(--pastel-peach)", tone: "var(--amber-deep)", big: "PDF", small: "ders sonrası panelde" },
  { fill: "var(--pastel-violet)", tone: "var(--violet-deep)", big: "16 sayı", small: "sonunda ciltlenir" },
] as const;

/** Fixed order — the dot colors cycle through the five accents in sequence. */
const CONTENTS = [
  {
    dot: "var(--mint-deep)",
    title: "Dersin özeti",
    body: "O hafta ne öğrenildi, hangi araç kullanıldı, öğrenci ne üretti.",
  },
  {
    dot: "var(--violet-deep)",
    title: "Kim bu isim?",
    body: "Bilgisayar tarihinden bir portre — hayatı, işi, bıraktığı iz.",
  },
  {
    dot: "var(--amber-deep)",
    title: "Yapay zeka notları",
    body: "Kısa, şaşırtıcı bilgiler; haftanın konusuna bağlanan ayrıntılar.",
  },
  {
    dot: "var(--blue-deep)",
    title: "Zaman tüneli",
    body: "Geçmişten o haftaya uzanan bir olay, tarihiyle birlikte.",
  },
  {
    dot: "var(--coral-deep)",
    title: "Çizgi roman",
    body: "Eski yazılımcıların hikâyesi. Her sayıda bir bölüm, ayda bir hikâye.",
  },
  {
    dot: "var(--mint-deep)",
    title: "Haftanın bulmacası",
    body: "Labirent, eşleştirme, kelime avı — kalemle çözülen sayfalar.",
  },
] as const;

export function Newsletter() {
  return (
    <section id="bulten" data-navtheme="light" className="nb-section nb-tint-peach">
      <div className="nb-wrap">
        <div style={{ maxWidth: 720, marginBottom: "clamp(30px,3.6vw,46px)" }}>
          <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
            04 — BÜLTEN
          </div>
          <h2 className="nb-h2" style={{ marginBottom: 18 }}>
            Her ders bir sayıyla bitiyor.
          </h2>
          <p className="nb-lead" style={{ maxWidth: 600 }}>
            Öğrenci dersten çıkarken o haftanın sayısı panelinde hazır bekliyor: 8–12 sayfalık PDF,
            o günkü dersle birebir eşleşiyor.
          </p>
        </div>

        <div className="nb-bulten">
          <div>
            {/* Real renders of the issues that have shipped, not mockups. */}
            <Reveal className="nb-deck">
              {COVERS.map((c) => (
                <Image
                  key={c.n}
                  src={c.src}
                  alt={`Bülten sayı ${c.n} kapağı`}
                  width={c.w}
                  height={c.h}
                  // Each cover is 38% of a column that is itself at most
                  // ~590px wide (1180px wrap, 1.06/.94 split), so ~225px is
                  // the widest it ever renders; below the 860px stack it is
                  // 38% of the viewport minus the section's own padding.
                  sizes="(max-width: 860px) 38vw, 225px"
                  className="nb-deck__cover"
                  style={{ left: c.left, zIndex: c.z, "--nb-tilt": c.tilt } as React.CSSProperties}
                />
              ))}
            </Reveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "clamp(12px,1.6vw,18px)",
                marginTop: "clamp(20px,2.6vw,32px)",
              }}
            >
              {STATS.map((s) => (
                <div
                  key={s.big}
                  className="nb-card nb-card--live"
                  style={
                    {
                      background: s.fill,
                      "--tone": s.tone,
                      padding: "20px 20px 18px",
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="nb-display"
                    style={{ fontSize: "clamp(1.6rem,2.6vw,2.2rem)", lineHeight: 1, marginBottom: 7 }}
                  >
                    {s.big}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
                      fontSize: 12,
                      letterSpacing: ".04em",
                      color: "var(--ink-soft)",
                    }}
                  >
                    {s.small}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".2em",
                color: "var(--ink-soft)",
                marginBottom: 6,
              }}
            >
              HER SAYIDA
            </div>
            {/* A plain list, not six cards: these are the parts of one
                document, and boxing each of them would claim they are six
                separate things. */}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {CONTENTS.map((item) => (
                <li
                  key={item.title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 0",
                    borderTop: "1px solid rgba(21,35,67,.16)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: item.dot,
                      border: "2px solid var(--stroke-color)",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="nb-display"
                      style={{ fontSize: "clamp(1rem,1.2vw,1.12rem)", lineHeight: 1.25, letterSpacing: 0 }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(.9rem,1.02vw,.99rem)",
                        lineHeight: 1.5,
                        color: "var(--ink-soft)",
                        marginTop: 3,
                      }}
                    >
                      {item.body}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
