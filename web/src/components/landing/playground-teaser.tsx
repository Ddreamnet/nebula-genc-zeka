import { MessageCircle, Image as ImageIcon, Video, Music2, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const tools = [
  { icon: MessageCircle, label: "Sohbet" },
  { icon: ImageIcon, label: "Görsel" },
  { icon: Video, label: "Video" },
  { icon: Music2, label: "Müzik" },
  { icon: Globe, label: "Web" },
];

// Small fixed vertical offsets (not motion) read as "scattered" instantly
// without needing animation to explain itself — calmer and easier for a
// non-technical parent to parse at a glance than the old drifting chips.
const offsets = [0, 18, -6, 22, 4];

export function PlaygroundTeaser() {
  return (
    <section
      id="ai"
      data-navtheme="dark"
      style={{ background: "var(--navy)", color: "var(--on-navy)", padding: "clamp(52px,6vw,88px) clamp(18px,5vw,64px)", position: "relative", overflow: "hidden" }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", bottom: -160, left: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle,rgba(61,95,224,.12),transparent 62%)" }}
      />
      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ maxWidth: 640, marginBottom: "clamp(32px,4.5vw,52px)" }}>
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, letterSpacing: ".2em", color: "var(--on-navy-soft)", marginBottom: 14 }}>03 — SİTE İÇİ AI ERİŞİMİ</div>
          <h2
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 900,
              fontStretch: "125%",
              letterSpacing: "-.02em",
              lineHeight: 0.96,
              fontSize: "clamp(2rem,5vw,3.6rem)",
              color: "#fff",
              marginBottom: 16,
              textWrap: "balance",
            }}
          >
            Dağınık <span style={{ color: "var(--amber)" }}>100+</span> araç,
            <br />
            tek panele düşüyor.
          </h2>
          <p style={{ fontSize: "clamp(1rem,1.4vw,1.15rem)", lineHeight: 1.5, color: "var(--on-navy-soft)", maxWidth: 540, margin: 0 }}>
            Yapay zeka için onlarca farklı site var — her biri ayrı üyelik, ayrı ödeme. Nebula hepsini çocuğunuzun tek panelinde birleştirir; öğretmeni her zaman yanında.
          </p>
        </div>

        <div className="nl-ai-flow" style={{ display: "grid", gap: 22 }}>
          <Reveal style={{ background: "rgba(169,182,212,.06)", border: "1px solid rgba(169,182,212,.16)", borderRadius: 16, padding: "22px 22px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "var(--font-plex-sans)", fontSize: 13, fontWeight: 600, color: "var(--on-navy-soft)", marginBottom: 22 }}>
              Nebula olmadan
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "18px 22px", padding: "4px 4px 10px" }}>
              {tools.map((t, i) => (
                <div key={t.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transform: `translateY(${offsets[i]}px)` }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "#22335c", border: "1px solid rgba(169,182,212,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <t.icon size={22} color="var(--on-navy-soft)" strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--on-navy-soft)" }}>{t.label}</span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--on-navy-soft)", margin: "16px 0 0" }}>
              Her biri ayrı bir site, ayrı bir hesap.
            </p>
          </Reveal>

          <div className="nl-ai-arrow" style={{ justifySelf: "center", alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: "rotate(90deg)" }}>
            <div className="nl-pulse" style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5F7FF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="19" y2="12"></line>
                <polyline points="13 6 19 12 13 18"></polyline>
              </svg>
            </div>
          </div>

          <Reveal
            delay={150}
            style={{
              background: "var(--navy2)",
              border: "1px solid rgba(169,182,212,.22)",
              borderRadius: 16,
              padding: "22px 22px 24px",
              boxShadow: "0 24px 60px rgba(6,12,28,.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Sparkles size={30} color="#F5F7FF" strokeWidth={2.2} />
            </div>
            <div style={{ fontFamily: "var(--font-archivo)", fontWeight: 800, fontStretch: "125%", fontSize: "1.3rem", color: "#fff", marginBottom: 18 }}>
              Nebula Paneli
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              {tools.map((t) => (
                <div key={t.label} style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(61,95,224,.18)", border: "1px solid rgba(61,95,224,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <t.icon size={19} color="var(--amber)" strokeWidth={2.2} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,.22)", borderRadius: 100, padding: "9px 16px" }}>
              <ShieldCheck size={15} color="var(--amber)" strokeWidth={2.3} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff" }}>Öğretmen gözetiminde, tek panel</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
