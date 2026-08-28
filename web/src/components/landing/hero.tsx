import { Nova } from "@/components/cast/nova";
import { Star, Planet, Rocket, PromptBubble } from "@/components/cast/props";
import { ContactCtas } from "./contact-ctas";
import { PaperButton } from "@/components/ui/paper-button";

/** What a student walks out with. Doubles as the hero's proof strip — the
 *  "100+ araç" claim means nothing on its own, but the list of things those
 *  tools produce is concrete and is exactly what the curriculum section then
 *  expands on. */
const OUTPUTS = [
  "kendi web sitesi",
  "konuşan 3D avatar",
  "oynanabilir oyun",
  "baskıya hazır afiş",
  "kendi şarkısı",
  "kısa film",
];

export function Hero() {
  return (
    <section
      id="top"
      data-navtheme="dark"
      className="nb-space nb-on-space"
      style={{
        position: "relative",
        overflow: "hidden",
        // Clears the fixed header (82–94px across breakpoints) plus room to
        // breathe. Static rather than JS-measured: the header is transparent
        // over this same navy, so a few pixels either way is invisible.
        padding: "clamp(124px, 11vw, 160px) clamp(18px, 5vw, 64px) 0",
      }}
    >
      <div className="nb-stars" aria-hidden />
      <div className="nb-stars nb-stars--twinkle" aria-hidden />

      <div className="nb-wrap nb-split" style={{ paddingBottom: "clamp(48px, 6vw, 76px)" }}>
        {/* ---- Copy ---- */}
        <div>
          {/* The original segmented status bar, restored. The only thing not
              brought back is its backdrop-filter: the blinking dot lives
              inside this element, and an opacity animation on top of a
              backdrop-filtered box is exactly what pinned the old hero to
              19fps. A flat translucent fill looks the same here. */}
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              maxWidth: "100%",
              alignItems: "stretch",
              marginBottom: 30,
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
              border: "1.5px solid rgba(239,231,214,.34)",
              clipPath:
                "polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)",
              background: "rgba(15,26,52,.35)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--blue)",
                color: "#F5F7FF",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: ".14em",
                padding: "9px 14px",
              }}
            >
              <span className="nb-blip" style={{ width: 8, height: 8, background: "#F5F7FF" }} />
              CANLI DERS
            </span>
            {/* "FORMAT: ONLİNE AKADEMİ" was engineer's shorthand — a parent
                scanning this strip is asking where their child has to be, not
                what category the product is filed under. */}
            {[
              { label: "YAŞ", value: "10–18" },
              { label: "NEREDE", value: "EVDEN" },
            ].map((m) => (
              <span
                key={m.label}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "5px 16px",
                  borderLeft: "1.5px solid rgba(239,231,214,.24)",
                }}
              >
                <span style={{ fontSize: 9, letterSpacing: ".24em", color: "var(--on-space-soft)", lineHeight: 1 }}>
                  {m.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".06em", color: "#fff", lineHeight: 1.25 }}>
                  {m.value}
                </span>
              </span>
            ))}
          </div>

          <h1 className="nb-h1" style={{ marginBottom: 24 }}>
            Çocuğunuz yapay zekayı izlemesin,{" "}
            <span style={{ color: "var(--amber)" }}>kullansın.</span>
          </h1>

          {/* Three short beats, then four concrete nouns. The previous version
              was one 34-word breath carrying a semicolon, an em dash and a
              false range ("web sitesinden ... kısa bir filme kadar" — those
              are not two ends of a scale), and it promised something "elle
              tutulur" without ever naming the thing being held. */}
          <p className="nb-lead" style={{ maxWidth: 560, marginBottom: 32 }}>
            Haftada bir ders, tamamen birebir, karşısında hep bir öğretmen. Her ders bitmiş bir
            işle bitiyor: bir web sitesi, oynanabilir bir oyun, kendi şarkısı, kendi kısa filmi.
          </p>

          <ContactCtas variant="trial">
            <PaperButton href="#nasil" tone="ghost-space">
              Nasıl işliyor?
            </PaperButton>
          </ContactCtas>

          <p
            style={{
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
              fontSize: 12.5,
              letterSpacing: ".03em",
              color: "var(--on-space-soft)",
              margin: "26px 0 0",
            }}
          >
            İlk ders bizden: 30 dk çocuğunuzla birebir, 10 dk sizinle. Kayıt şartı yok.
          </p>
        </div>

        {/* ---- Nova's stage ----
            Every prop floats on its own clock (negative delays offset the
            shared keyframes) so the cluster never pulses in unison, which is
            what makes looping CSS motion read as mechanical. */}
        <div className="nb-cast nb-stage" aria-hidden>
          <Planet className="nb-cast__prop nb-drift nb-delay-2" style={{ width: "26%", top: "4%", left: "-2%" }} />
          <Star className="nb-cast__prop nb-float nb-delay-1" style={{ width: "9%", top: "22%", right: "6%" }} color="#FFD27A" />
          <Star className="nb-cast__prop nb-float nb-delay-3" style={{ width: "6%", top: "62%", left: "2%" }} color="#9BE7FF" />
          <Rocket className="nb-cast__prop nb-float nb-delay-4" style={{ width: "15%", bottom: "20%", right: "0%" }} />

          <Nova
            pose="float"
            className="nb-float"
            style={{ position: "absolute", top: "9%", left: "18%", width: "64%" }}
          />

          <div
            className="nb-cast__prop nb-bob nb-delay-2"
            style={{ bottom: "2%", left: "-4%", maxWidth: "72%" }}
          >
            <PromptBubble text="bana uzayda geçen bir oyun yap" />
          </div>
        </div>
      </div>

      {/* ---- Proof strip ---- */}
      <div
        style={{
          position: "relative",
          borderTop: "1px solid var(--space-line)",
          padding: "18px 0",
        }}
      >
        <div className="nb-marquee">
          {/* Two identical copies; the track slides exactly -50% so the seam
              always lands on a duplicate and the loop is invisible. */}
          {[0, 1].map((copy) => (
            <div className="nb-marquee__track" key={copy} aria-hidden={copy === 1}>
              {OUTPUTS.map((o) => (
                <span
                  key={o}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
                    fontWeight: 500,
                    fontSize: "clamp(15px, 1.6vw, 19px)",
                    color: "var(--on-space-soft)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Star className="size-[14px] shrink-0" color="#FF9F45" outlined={false} />
                  {o}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Torn edge into the paper world below. */}
      <div className="nb-seam" style={{ marginLeft: "calc(clamp(18px, 5vw, 64px) * -1)", marginRight: "calc(clamp(18px, 5vw, 64px) * -1)" }} />
    </section>
  );
}
