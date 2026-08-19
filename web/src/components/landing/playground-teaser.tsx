import { ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Bit, Star } from "@/components/cast/props";
import { ProviderBadge } from "@/components/playground/provider-logos";
import type { ProviderId } from "@/lib/playground/tools";

/**
 * Real vendors, named. The section's claim is "onlarca farklı site, her biri
 * ayrı üyelik" — generic "Sohbet / Görsel / Video" chips illustrate a
 * category, not a problem. A parent recognises these names and immediately
 * understands what "hepsi tek panelde" is worth.
 *
 * Marks come from the Playground's ProviderBadge, which already carries the
 * licensed simple-icons paths (and a plain monogram for the brands with no
 * verified mark available) — so the landing can't drift out of sync with the
 * panel's own logos.
 *
 * Fixed rotations and offsets, not motion: "scattered" has to be legible in a
 * still frame, and drifting chips made a parent read this card as broken
 * rather than as the problem being described.
 */
const VENDORS: { id: ProviderId; label: string; r: number; y: number }[] = [
  { id: "openai", label: "ChatGPT", r: -8, y: 0 },
  { id: "anthropic", label: "Claude", r: 6, y: 18 },
  { id: "gemini", label: "Gemini", r: -4, y: -6 },
  { id: "bytedance", label: "Seedance", r: 9, y: 14 },
  { id: "suno", label: "Suno", r: -6, y: 2 },
  { id: "kuaishou", label: "Kling", r: 4, y: 20 },
  { id: "elevenlabs", label: "ElevenLabs", r: -9, y: 6 },
  { id: "blackforest", label: "Flux", r: 7, y: -4 },
  { id: "runway", label: "Runway", r: -3, y: 16 },
  { id: "xai", label: "Grok", r: 8, y: 0 },
];

export function PlaygroundTeaser() {
  return (
    <section
      id="ai"
      data-navtheme="dark"
      className="nb-space nb-on-space nb-section"
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div className="nb-stars" aria-hidden />
      <div className="nb-stars nb-stars--twinkle" aria-hidden />

      <div className="nb-wrap">
        <div className="nb-measure" style={{ marginBottom: "clamp(34px,4.5vw,54px)" }}>
          <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
            03 — SİTE İÇİ AI ERİŞİMİ
          </div>
          <h2 className="nb-h2" style={{ marginBottom: 18 }}>
            Dağınık <span style={{ color: "var(--amber)" }}>100+</span> araç,
            <br />
            tek panele düşüyor.
          </h2>
          <p className="nb-lead" style={{ maxWidth: 560 }}>
            Yapay zeka için onlarca farklı site var. Her biri ayrı üyelik, ayrı ödeme. Nebula
            hepsini çocuğunuzun tek panelinde birleştirir; öğretmeni her zaman yanında.
          </p>
        </div>

        {/* The columns come from .nb-grid--2's media query — an inline
            grid-template-columns here would outrank it and pin the section to
            one column at every width. */}
        <div className="nb-grid nb-grid--2" style={{ alignItems: "stretch" }}>
          {/* ---- Before ---- */}
          <Reveal style={{ height: "100%" }}>
            <div
              className="nb-card nb-card--space"
              style={{
                height: "100%",
                padding: "24px 22px 26px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
                  fontSize: 12,
                  letterSpacing: ".14em",
                  color: "var(--on-space-soft)",
                  marginBottom: 26,
                }}
              >
                NEBULA OLMADAN
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "20px 16px",
                  flex: 1,
                  alignContent: "center",
                  paddingBottom: 14,
                }}
              >
                {VENDORS.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 7,
                      transform: `translateY(${v.y}px) rotate(${v.r}deg)`,
                    }}
                  >
                    <ProviderBadge
                      provider={v.id}
                      className="size-12"
                      style={{ border: "2.5px solid var(--space-deep)" }}
                    />
                    <span style={{ fontSize: 12, color: "var(--on-space-soft)", whiteSpace: "nowrap" }}>
                      {v.label}
                    </span>
                  </div>
                ))}
              </div>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  color: "var(--on-space-soft)",
                  margin: "14px 0 0",
                }}
              >
                Her biri ayrı bir site, ayrı bir hesap.
              </p>
            </div>
          </Reveal>

          {/* ---- After ---- */}
          <Reveal delay={140} style={{ height: "100%" }}>
            <div
              className="nb-card"
              style={
                {
                  "--tone": "var(--blue-deep)",
                  height: "100%",
                  padding: "24px 22px 26px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                } as React.CSSProperties
              }
            >
              <div style={{ position: "relative", marginBottom: 6 }}>
                <Star
                  className="nb-float nb-delay-1"
                  style={{ position: "absolute", width: 20, top: -6, right: -18 }}
                  color="#FF9F45"
                />
                <Bit className="nb-bob" style={{ width: 78 }} />
              </div>

              <div className="nb-h3" style={{ marginBottom: 18 }}>
                Nebula Paneli
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {VENDORS.map((v) => (
                  <ProviderBadge
                    key={v.id}
                    provider={v.id}
                    className="size-11"
                    style={{ border: "2.5px solid var(--stroke-color)" }}
                  />
                ))}
              </div>

              <span className="nb-chip" style={{ background: "var(--mint)", marginTop: "auto" }}>
                <ShieldCheck size={16} strokeWidth={2.4} />
                Öğretmen gözetiminde, tek panel
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
