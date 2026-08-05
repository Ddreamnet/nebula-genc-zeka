import { Reveal } from "@/components/ui/reveal";
import { Faq } from "./faq";

const trust = [
  {
    title: "Kimler ders veriyor",
    desc: "Bilgisayar ve yazılım mühendisliği mezunu, yapay zekayla gerçek projeler yapmış genç eğitmenler. Aracı günlük kullanan, öğrenciyle aynı dili konuşan insanlar.",
  },
  {
    title: "Çocuk güvenliği",
    desc: "Araçlara öğrenci panelinden, öğretmen gözetiminde erişiliyor. Küçük grup sayesinde her öğrenci sürekli takip ediliyor; yalnız bırakılan bir ekran yok.",
  },
  {
    title: "Veliyle iletişim",
    desc: "Ne yapıldığını görürsünüz — çocuğunuzun ürettiği işler ortada. Sorularınız için Instagram'dan ya da WhatsApp'tan bize her zaman yazabilirsiniz.",
  },
];

export function Safety() {
  return (
    <section
      id="guven"
      data-navtheme="light"
      style={{
        background: "var(--paper)",
        backgroundImage:
          "linear-gradient(rgba(35,33,28,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(35,33,28,.045) 1px,transparent 1px)",
        backgroundSize: "34px 34px",
        padding: "clamp(64px,8vw,120px) clamp(18px,5vw,64px)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ maxWidth: 720, marginBottom: "clamp(38px,5vw,56px)" }}>
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, letterSpacing: ".2em", color: "var(--ink-soft)", marginBottom: 16 }}>04 — GÜVEN</div>
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
            Gelin, acele etmeden anlatalım.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: "clamp(34px,5vw,48px)" }}>
          {trust.map((t) => (
            <div key={t.title} style={{ background: "var(--paper2)", border: "1px solid #d8cbae", borderRadius: 14, padding: "28px 26px" }}>
              <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: "1.35rem", color: "var(--navy)", marginBottom: 12 }}>{t.title}</h3>
              <p style={{ fontSize: "1rem", lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>

        <Reveal style={{ marginBottom: "clamp(34px,5vw,48px)" }}>
          <div style={{ background: "var(--navy)", borderRadius: 16, padding: "clamp(28px,4vw,44px)" }}>
            <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12, letterSpacing: ".18em", color: "var(--amber)", marginBottom: 14 }}>ÜCRETSİZ DENEME DERSİ</div>
            <h3 style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: "#fff", marginBottom: 16, textWrap: "balance" }}>
              Önce görün, sonra karar verin.
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 210, background: "var(--navy2)", borderRadius: 11, padding: "18px 20px" }}>
                <div style={{ fontFamily: "var(--font-archivo)", fontWeight: 900, fontStretch: "125%", fontSize: "1.8rem", color: "var(--amber)", lineHeight: 1, marginBottom: 6 }}>30 dk</div>
                <div style={{ fontSize: ".98rem", lineHeight: 1.5, color: "var(--on-navy-soft)" }}>
                  Çocuğunuzla <strong style={{ color: "#fff", fontWeight: 600 }}>birebir</strong> deneme dersi — gerçekten bir şey üretiyor.
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 210, background: "var(--navy2)", borderRadius: 11, padding: "18px 20px" }}>
                <div style={{ fontFamily: "var(--font-archivo)", fontWeight: 900, fontStretch: "125%", fontSize: "1.8rem", color: "var(--amber)", lineHeight: 1, marginBottom: 6 }}>10 dk</div>
                <div style={{ fontSize: ".98rem", lineHeight: 1.5, color: "var(--on-navy-soft)" }}>
                  Ardından <strong style={{ color: "#fff", fontWeight: 600 }}>sizinle görüşme</strong> — sorularınızı yanıtlıyoruz, programı anlatıyoruz.
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12, letterSpacing: ".18em", color: "var(--ink-soft)", marginBottom: 18 }}>SIK SORULANLAR</div>
        <Faq />
      </div>
    </section>
  );
}
