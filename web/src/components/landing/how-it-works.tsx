import { Reveal } from "@/components/ui/reveal";

const facts = [
  { value: "4 ay", label: "program süresi" },
  { value: "1 gün", label: "haftada ders" },
  { value: "40+40", label: "dakika canlı ders" },
  { value: "2 kişi", label: "grup büyüklüğü" },
];

export function HowItWorks() {
  return (
    <section
      id="nasil"
      data-navtheme="light"
      style={{ background: "var(--paper2)", padding: "clamp(64px,8vw,120px) clamp(18px,5vw,64px)" }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ maxWidth: 720, marginBottom: "clamp(38px,5vw,56px)" }}>
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, letterSpacing: ".2em", color: "var(--ink-soft)", marginBottom: 16 }}>02 — NASIL İŞLİYOR</div>
          <h2
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 800,
              fontStretch: "125%",
              letterSpacing: "-.02em",
              lineHeight: 1,
              fontSize: "clamp(2rem,5.2vw,3.6rem)",
              color: "var(--navy)",
              textWrap: "balance",
            }}
          >
            Küçük grup, net bir düzen.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 1,
            background: "#d8cbae",
            border: "1px solid #d8cbae",
            borderRadius: 14,
            overflow: "hidden",
            marginBottom: "clamp(34px,5vw,52px)",
          }}
        >
          {facts.map((f) => (
            <div key={f.label} style={{ background: "var(--paper)", padding: "26px 22px" }}>
              <div style={{ fontFamily: "var(--font-archivo)", fontWeight: 900, fontStretch: "125%", fontSize: "clamp(2rem,4vw,3rem)", color: "var(--navy)", lineHeight: 1 }}>{f.value}</div>
              <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12, letterSpacing: ".06em", color: "var(--ink-soft)", marginTop: 8 }}>{f.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12, letterSpacing: ".18em", color: "var(--ink-soft)", marginBottom: 18 }}>BİR DERSİN AKIŞI</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, alignItems: "stretch" }}>
          <Reveal>
            <div style={{ background: "var(--paper)", border: "1px solid #d8cbae", borderRadius: 14, padding: "28px 26px", height: "100%" }}>
              <div style={{ fontFamily: "var(--font-archivo)", fontWeight: 900, fontStretch: "125%", fontSize: "2.4rem", color: "var(--amber)", lineHeight: 1, marginBottom: 14 }}>40′</div>
              <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: "1.5rem", color: "var(--navy)", marginBottom: 10 }}>İlk 40 dakika — öğreniyor</h3>
              <p style={{ fontSize: "1rem", lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>Öğretmen o günkü aracı ve fikri gösteriyor. Ne yaptığını, neden işe yaradığını anlıyor.</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ background: "var(--navy)", border: "1px solid var(--navy)", borderRadius: 14, padding: "28px 26px", height: "100%" }}>
              <div style={{ fontFamily: "var(--font-archivo)", fontWeight: 900, fontStretch: "125%", fontSize: "2.4rem", color: "var(--amber)", lineHeight: 1, marginBottom: 14 }}>40′</div>
              <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: "1.5rem", color: "#fff", marginBottom: 10 }}>Sonraki 40 dakika — üretiyor</h3>
              <p style={{ fontSize: "1rem", lineHeight: 1.55, color: "var(--on-navy-soft)", margin: 0 }}>Öğretmenle birlikte kendi çıktısını yapıyor. Ders bitince ortada bitmiş, gerçek bir iş oluyor.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
