import { Reveal } from "@/components/ui/reveal";
import { Nova } from "@/components/cast/nova";
import { Star } from "@/components/cast/props";

/** The four facts a parent actually asks first. Each gets its own accent so
 *  the row scans as four separate answers, not one table. */
const FACTS = [
  { value: "4 ay", label: "program süresi", fill: "#DCD2FF", tone: "var(--violet-deep)" },
  { value: "1 gün", label: "haftada ders", fill: "#C6F1DC", tone: "var(--mint-deep)" },
  { value: "40+40", label: "dakika canlı ders", fill: "#FFE1C4", tone: "var(--amber-deep)" },
  { value: "2 kişi", label: "grup büyüklüğü", fill: "#FFD6DE", tone: "var(--coral-deep)" },
];

function Step({
  n,
  minutes,
  title,
  desc,
  space,
  delay,
}: {
  n: string;
  minutes: string;
  title: string;
  desc: string;
  space?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} style={{ height: "100%" }}>
      <div
        className={space ? "nb-card nb-card--space" : "nb-card"}
        style={
          {
            "--tone": space ? undefined : "var(--stroke-color)",
            height: "100%",
            padding: "clamp(24px,3vw,32px)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          } as React.CSSProperties
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: space ? "var(--amber)" : "var(--blue)",
              color: space ? "var(--ink)" : "#fff",
              border: "var(--stroke) solid var(--stroke-color)",
              fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
              fontWeight: 600,
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            {n}
          </span>
          <span
            className="nb-display"
            style={{
              fontSize: "clamp(2rem,3.4vw,2.6rem)",
              color: space ? "var(--amber)" : "var(--blue)",
              lineHeight: 1,
            }}
          >
            {minutes}
          </span>
        </div>
        <h3 className="nb-h3">{title}</h3>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            margin: 0,
            color: space ? "var(--on-space-soft)" : "var(--ink-soft)",
          }}
        >
          {desc}
        </p>
      </div>
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <section id="nasil" data-navtheme="light" className="nb-section nb-paper-sunken">
      <div className="nb-wrap">
        <div className="nb-measure" style={{ marginBottom: "clamp(34px,4.5vw,52px)" }}>
          <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
            02 — NASIL İŞLİYOR
          </div>
          <h2 className="nb-h2">Küçük grup, net bir düzen.</h2>
        </div>

        <div className="nb-grid nb-grid--4" style={{ marginBottom: "clamp(40px,5vw,60px)" }}>
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={i * 70}>
              <div
                className="nb-card nb-card--live"
                style={
                  {
                    "--tone": f.tone,
                    background: f.fill,
                    padding: "26px 24px 24px",
                    height: "100%",
                  } as React.CSSProperties
                }
              >
                <div
                  className="nb-display"
                  style={{ fontSize: "clamp(2.1rem,3.8vw,2.9rem)", lineHeight: 1, marginBottom: 10 }}
                >
                  {f.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
                    fontSize: 12.5,
                    letterSpacing: ".04em",
                    color: "var(--ink-soft)",
                  }}
                >
                  {f.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <span className="nb-eyebrow">BİR DERSİN AKIŞI</span>
          <Star className="nb-float size-[16px]" color="#FF9F45" />
        </div>

        {/* Nova sits between the two halves of the lesson: she's what connects
            "öğreniyor" to "üretiyor", which is the point the section is making. */}
        <div className="nb-grid nb-grid--2" style={{ alignItems: "stretch", position: "relative" }}>
          <Step
            n="1"
            minutes="40′"
            title="İlk 40 dakika: öğreniyor"
            desc="Öğretmen o günkü aracı ve fikri gösteriyor. Ne yaptığını, neden işe yaradığını anlıyor."
          />
          <Step
            n="2"
            minutes="40′"
            title="İkinci 40 dakika: sıra onda"
            desc="Sıra ona geçiyor. Öğretmen yanında ama klavye onda. Ders bittiğinde iş de bitmiş oluyor."
            space
            delay={110}
          />
          <div
            className="hidden md:block"
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 2,
            }}
          >
            <Nova pose="cheer" className="nb-bob" style={{ width: 92 }} eyeColor="#FFD27A" />
          </div>
        </div>
      </div>
    </section>
  );
}
