import { Reveal } from "@/components/ui/reveal";
import { Nova } from "@/components/cast/nova";
import { Star } from "@/components/cast/props";
import { Faq } from "./faq";

const TRUST = [
  {
    title: "Kimler ders veriyor",
    desc: "Bu araçları öğretmek için değil, kendi işlerinde kullandıkları için biliyorlar. Hepsi bilgisayar ya da yazılım mühendisliği mezunu, hepsi öğrenciyle aynı dili konuşuyor.",
    fill: "#D3DCFB",
    tone: "var(--blue-deep)",
  },
  {
    title: "Çocuk güvenliği",
    // Deliberately precise: the old copy said tools were reached "öğretmen
    // gözetiminde" full stop, which a parent reads as "my child can't open
    // this alone". They can — the student panel is theirs, with its own
    // limited allowance. Saying so plainly is both true and still reassuring.
    desc: "Derste ekran hiçbir an yalnız kalmıyor; öğretmen orada. Ders dışında kendi paneli açık ama sınırlı bir hakla. Ne ürettiğini biz de görüyoruz, isterseniz siz de.",
    fill: "#C6F1DC",
    tone: "var(--mint-deep)",
  },
  {
    title: "Veliyle iletişim",
    desc: "Çocuğunuzun yaptığı her iş elinizin altında. Bir şey sormak istediğinizde WhatsApp hep açık, Instagram da öyle.",
    fill: "#FFE1C4",
    tone: "var(--amber-deep)",
  },
];

export function Safety() {
  return (
    <section id="guven" data-navtheme="light" className="nb-section nb-paper">
      <div className="nb-wrap">
        <div className="nb-measure" style={{ marginBottom: "clamp(34px,4.5vw,52px)" }}>
          <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
            04 — GÜVEN
          </div>
          <h2 className="nb-h2">Çocuğunuzu kime emanet ediyorsunuz?</h2>
        </div>

        <div className="nb-grid nb-grid--3" style={{ marginBottom: "clamp(34px,4.5vw,48px)" }}>
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delay={i * 80} style={{ height: "100%" }}>
              <div
                className="nb-card nb-card--live"
                style={
                  {
                    "--tone": t.tone,
                    background: t.fill,
                    height: "100%",
                    padding: "28px 26px",
                  } as React.CSSProperties
                }
              >
                <h3 className="nb-h3" style={{ marginBottom: 12 }}>
                  {t.title}
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.62, color: "var(--ink-soft)", margin: 0 }}>
                  {t.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Free trial — the single most persuasive fact on the page, so it gets
            the only space-colored card in a paper section and Nova beside it. */}
        <Reveal style={{ marginBottom: "clamp(38px,5vw,56px)" }}>
          <div
            className="nb-card nb-card--space"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "clamp(28px,4vw,44px)",
            }}
          >
            <div className="nb-stars" aria-hidden />
            <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center" }}>
              <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                <div className="nb-eyebrow" style={{ color: "var(--amber)", marginBottom: 16 }}>
                  ÜCRETSİZ DENEME DERSİ
                </div>
                <h3
                  className="nb-display"
                  style={{ fontSize: "clamp(1.6rem,3.2vw,2.4rem)", marginBottom: 20, color: "var(--on-space)" }}
                >
                  Önce görün, sonra karar verin.
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {[
                    {
                      big: "30 dk",
                      body: (
                        <>
                          Çocuğunuzla <strong style={{ color: "#fff", fontWeight: 700 }}>birebir</strong> deneme
                          dersi. Gerçekten bir şey üretiyor.
                        </>
                      ),
                    },
                    {
                      big: "10 dk",
                      body: (
                        <>
                          Ardından <strong style={{ color: "#fff", fontWeight: 700 }}>sizinle görüşme</strong>.
                          Sorularınızı yanıtlıyoruz, programı anlatıyoruz.
                        </>
                      ),
                    },
                  ].map((b) => (
                    <div
                      key={b.big}
                      style={{
                        flex: "1 1 220px",
                        background: "var(--space-deep)",
                        border: "var(--stroke) solid #05080F",
                        borderRadius: "var(--radius-control)",
                        padding: "18px 20px",
                      }}
                    >
                      <div
                        className="nb-display"
                        style={{ fontSize: "1.7rem", color: "var(--amber)", marginBottom: 8 }}
                      >
                        {b.big}
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--on-space-soft)" }}>
                        {b.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden md:block" style={{ position: "relative", flexShrink: 0 }} aria-hidden>
                <Star
                  className="nb-float nb-delay-3"
                  style={{ position: "absolute", width: 22, top: 4, left: -12 }}
                  color="#FFD27A"
                />
                <Nova pose="wave" className="nb-float nb-delay-1" style={{ width: 154 }} />
              </div>
            </div>
          </div>
        </Reveal>

        <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
          SIK SORULANLAR
        </div>
        <Faq />
      </div>
    </section>
  );
}
