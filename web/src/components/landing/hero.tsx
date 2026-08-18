import Image from "next/image";
import { ContactCtas } from "./contact-ctas";

export function Hero() {
  return (
    <section
      id="top"
      data-navtheme="dark"
      style={{
        position: "relative",
        background: "var(--navy)",
        color: "var(--on-navy)",
        // Static value (header height, ~82-94px across breakpoints, + 28px
        // breathing room) instead of a JS-measured CSS var — the header is
        // transparent and this section's background already matches it, so
        // there's no visible seam if this runs slightly taller than the
        // header on any given viewport; simpler and removes a whole
        // ResizeObserver+effect that a fixed/condensing header doesn't need.
        paddingTop: "clamp(110px, 9vw, 124px)",
        paddingLeft: "clamp(18px,5vw,64px)",
        paddingRight: "clamp(18px,5vw,64px)",
        paddingBottom: "clamp(70px,8vw,120px)",
        overflow: "hidden",
      }}
    >
      <Image src="/landing/hero-bg.webp" alt="" fill priority className="object-cover pointer-events-none" aria-hidden />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(21,35,67,.34),rgba(15,26,52,.58))",
          backdropFilter: "blur(4px) saturate(118%)",
          WebkitBackdropFilter: "blur(4px) saturate(118%)",
        }}
      />
      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              maxWidth: "100%",
              alignItems: "stretch",
              marginBottom: 30,
              fontFamily: "var(--font-plex-mono)",
              border: "1.5px solid rgba(239,231,214,.34)",
              clipPath: "polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)",
              background: "rgba(15,26,52,.35)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--amber)",
                color: "#F5F7FF",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: ".14em",
                padding: "9px 14px",
              }}
            >
              <span className="nl-live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#F5F7FF", display: "inline-block" }} />
              CANLI
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", justifyContent: "center", padding: "5px 16px", borderLeft: "1.5px solid rgba(239,231,214,.24)" }}>
              <span style={{ fontSize: 9, letterSpacing: ".24em", color: "var(--on-navy-soft)", lineHeight: 1 }}>YAŞ</span>
              <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".06em", color: "#fff", lineHeight: 1.25 }}>10–18</span>
            </span>
            <span style={{ display: "inline-flex", flexDirection: "column", justifyContent: "center", padding: "5px 16px", borderLeft: "1.5px solid rgba(239,231,214,.24)" }}>
              <span style={{ fontSize: 9, letterSpacing: ".24em", color: "var(--on-navy-soft)", lineHeight: 1 }}>FORMAT</span>
              <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".06em", color: "#fff", lineHeight: 1.25 }}>ONLİNE AKADEMİ</span>
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-.02em",
              marginBottom: 30,
              fontSize: "clamp(2rem,4.6vw,3.4rem)",
              color: "var(--on-navy)",
              textWrap: "balance",
            }}
          >
            Çocuğunuz yapay zekayı izlemesin,{" "}
            <span style={{ color: "var(--amber)" }}>kullansın.</span>
          </h1>

          <p style={{ fontSize: "clamp(1.05rem,1.6vw,1.3rem)", lineHeight: 1.55, color: "var(--on-navy-soft)", maxWidth: 600, margin: "0 0 34px", textWrap: "pretty" }}>
            Haftada bir gün, iki kişilik küçük gruplarda; öğretmen eşliğinde 100&apos;den fazla yapay zeka aracını kullanarak her derste elle tutulur bir şey üretiyorlar — kendi web sitesinden konuşan bir 3D avatara, bir şarkıdan kısa bir filme kadar.
          </p>

          <ContactCtas iconOnly>
            <a href="#nasil" className="nl-btn nl-btn--lg nl-btn--outline-dark inline-flex">
              Nasıl işliyor?
            </a>
          </ContactCtas>
          <p style={{ fontFamily: "var(--font-plex-mono)", fontSize: 12.5, letterSpacing: ".04em", color: "var(--on-navy-soft)", margin: "22px 0 0" }}>
            Ücretsiz deneme dersi mevcut · birebir, 30 dk + veli görüşmesi
          </p>
        </div>
      </div>
    </section>
  );
}
