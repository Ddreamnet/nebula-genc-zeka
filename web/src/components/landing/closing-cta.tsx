import Image from "next/image";
import { ContactCtas } from "./contact-ctas";
import { siteConfig } from "@/lib/site";
import { Nova } from "@/components/cast/nova";
import { Star, Planet, NovaSays } from "@/components/cast/props";

/** Footer link row. Blog lives here because it had no entry point anywhere on
 *  the site — no navbar item, no mobile-menu item, no footer link — so nothing
 *  written in the admin panel was reachable by a visitor. */
const footerLinks = [
  { label: "Blog", href: "/blog" },
  { label: "KVKK", href: "/kvkk" },
  { label: "Gizlilik ve Çerezler", href: "/gizlilik" },
];

export function ClosingCta() {
  return (
    <section
      id="iletisim"
      data-navtheme="dark"
      className="nb-space nb-on-space"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(76px,9vw,130px) clamp(18px,5vw,64px) clamp(36px,4vw,52px)",
      }}
    >
      <div className="nb-stars" aria-hidden />
      <div className="nb-stars nb-stars--twinkle" aria-hidden />

      <div className="nb-wrap">
        <div className="nb-split" style={{ marginBottom: "clamp(48px,6vw,76px)" }}>
          <div>
            <div className="nb-eyebrow" style={{ marginBottom: 20 }}>
              05 — İLETİŞİM
            </div>
            <h2 className="nb-h2" style={{ marginBottom: 20 }}>
              Merak ettiğinizi
              <br />
              sorun.
            </h2>
            <p className="nb-lead" style={{ maxWidth: 560, marginBottom: 34 }}>
              Kayıt için acele etmenize gerek yok. Önce yazın, konuşalım; isterseniz ücretsiz deneme
              dersiyle çocuğunuz bizzat denesin.
            </p>
            <ContactCtas variant="trial" />
          </div>

          {/* Nova signs off. Same character that opened the page, so the scroll
              ends where it started rather than trailing away into a footer.
              Her line is aimed at the child, and it is the last thing on the
              page that lowers the cost of writing to us. */}
          <div className="nb-cast" style={{ position: "relative", minHeight: 220 }} aria-hidden>
            <Planet
              className="nb-cast__prop nb-drift nb-delay-3"
              style={{ width: 96, top: 6, right: "12%" }}
              color="#FF6B8A"
            />
            <Star
              className="nb-cast__prop nb-float nb-delay-1"
              style={{ width: 24, bottom: "18%", left: "14%" }}
              color="#FFD27A"
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <NovaSays text="aptalca soru diye bir şey yok" />
              <Nova pose="wave" className="nb-float" style={{ display: "block", width: 200 }} />
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--space-line)",
            paddingTop: 30,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <Image
            src="/landing/logo-white.png"
            alt="Nebula Genç Zeka"
            width={220}
            height={38}
            style={{ height: 38, width: "auto" }}
          />
          <div
            style={{
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
              fontSize: 11.5,
              letterSpacing: ".05em",
              color: "var(--on-space-soft)",
              textAlign: "right",
            }}
          >
            © {new Date().getFullYear()} NEBULA GENÇ ZEKA · 10–18 YAŞ AI AKADEMİSİ
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 20px" }}>
          {footerLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
                fontSize: 11.5,
                letterSpacing: ".04em",
                color: "var(--on-space-soft)",
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            href={`mailto:${siteConfig.email}`}
            style={{
              fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
              fontSize: 11.5,
              letterSpacing: ".04em",
              color: "var(--on-space-soft)",
            }}
          >
            {siteConfig.email}
          </a>
        </div>
      </div>
    </section>
  );
}
