import Image from "next/image";
import { ContactCtas } from "./contact-ctas";

const legal = [
  { label: "KVKK", href: "/kvkk" },
  { label: "Gizlilik ve Çerezler", href: "/gizlilik" },
];

export function ClosingCta() {
  return (
    <section
      id="iletisim"
      data-navtheme="dark"
      style={{ background: "var(--navy)", color: "var(--on-navy)", padding: "clamp(72px,9vw,130px) clamp(18px,5vw,64px) clamp(40px,5vw,60px)" }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ maxWidth: 760, marginBottom: "clamp(44px,6vw,72px)" }}>
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, letterSpacing: ".2em", color: "var(--on-navy-soft)", marginBottom: 20 }}>05 — İLETİŞİM</div>
          <h2
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 900,
              fontStretch: "125%",
              letterSpacing: "-.02em",
              lineHeight: 0.96,
              fontSize: "clamp(2.3rem,6vw,4.2rem)",
              color: "#fff",
              marginBottom: 20,
              textWrap: "balance",
            }}
          >
            Merak ettiğinizi
            <br />
            sorun.
          </h2>
          <p style={{ fontSize: "clamp(1.05rem,1.5vw,1.25rem)", lineHeight: 1.55, color: "var(--on-navy-soft)", maxWidth: 560, margin: "0 0 32px" }}>
            Kayıt için acele etmenize gerek yok. Önce yazın, konuşalım; isterseniz ücretsiz deneme dersiyle çocuğunuz bizzat denesin.
          </p>
          <ContactCtas />
        </div>

        <div style={{ borderTop: "1px solid rgba(169,182,212,.18)", paddingTop: 30, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <Image src="/landing/logo-white.png" alt="Nebula Genç Zeka" width={220} height={38} style={{ height: 38, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: 11.5, letterSpacing: ".06em", color: "var(--on-navy-soft)", textAlign: "right" }}>
            © {new Date().getFullYear()} NEBULA GENÇ ZEKA · 10–18 YAŞ AI AKADEMİSİ
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          {legal.map((l) => (
            <a key={l.href} href={l.href} style={{ fontFamily: "var(--font-plex-mono)", fontSize: 11, letterSpacing: ".04em", color: "var(--on-navy-soft)" }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
