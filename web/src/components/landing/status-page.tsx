import type { ReactNode } from "react";
import { landingVars } from "@/lib/landing-theme";
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
    <div style={{ ...landingVars, fontFamily: "var(--font-plex-sans)" }}>
      <LandingNavbar />
      <main
        data-navtheme="light"
        style={{
          background: "var(--paper)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          paddingTop: "clamp(96px,12vw,140px)",
          paddingBottom: "clamp(56px,8vw,100px)",
          paddingInline: "clamp(18px,5vw,64px)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
          <div
            style={{
              fontFamily: "var(--font-plex-mono)",
              fontSize: 12.5,
              letterSpacing: ".2em",
              color: "var(--amber-dark)",
              marginBottom: 18,
            }}
          >
            {code}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-archivo)",
              fontWeight: 900,
              fontStretch: "125%",
              letterSpacing: "-.02em",
              lineHeight: 1.02,
              fontSize: "clamp(2.1rem,5.5vw,3.4rem)",
              color: "var(--navy)",
              margin: "0 0 18px",
              textWrap: "balance",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: "clamp(1.02rem,1.6vw,1.2rem)",
              lineHeight: 1.55,
              color: "var(--ink-soft)",
              margin: "0 0 34px",
              maxWidth: 520,
              textWrap: "pretty",
            }}
          >
            {message}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{children}</div>
        </div>
      </main>
    </div>
  );
}
