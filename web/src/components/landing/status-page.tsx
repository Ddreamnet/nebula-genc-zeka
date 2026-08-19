import type { ReactNode } from "react";
import { landingVars, legacyAliases } from "@/lib/landing-theme";
import { landingFontClass } from "@/lib/landing-fonts";
import { LandingNavbar } from "./landing-navbar";
import "@/app/(marketing)/landing.css";

/**
 * Shell for the dead-end pages (404, render error) that sit outside the
 * (marketing) route group and therefore get neither its layout, its palette,
 * nor landing.css — all three are pulled in here instead so these pages look
 * like the rest of the site rather than Next's bare default.
 *
 * `data-navtheme="light"` is required for the same reason it is on LegalPage:
 * the navbar picks its dark/light text from whichever [data-navtheme] section
 * sits under the header, and with none present it stays on its initial "dark"
 * (light text) — invisible on this page's paper background.
 */
export function StatusPage({
  code,
  title,
  message,
  children,
}: {
  code: string;
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <div className={`${landingFontClass} nb`} style={{ ...landingVars, ...legacyAliases }}>
      <LandingNavbar />
      <main
        data-navtheme="light"
        className="nb-paper"
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          paddingTop: "clamp(96px,12vw,140px)",
          paddingBottom: "clamp(56px,8vw,100px)",
          paddingInline: "clamp(18px,5vw,64px)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
          <div className="nb-eyebrow" style={{ marginBottom: 18 }}>
            {code}
          </div>
          <h1 className="nb-h2" style={{ marginBottom: 18 }}>
            {title}
          </h1>
          <p className="nb-lead" style={{ maxWidth: 520, marginBottom: 34 }}>
            {message}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{children}</div>
        </div>
      </main>
    </div>
  );
}
