import { LandingNavbar } from "@/components/landing/landing-navbar";
import "./landing.css";

/**
 * Landing-page palette (navy/space-blue/paper) is scoped to this route group
 * only — dashboard/auth keep Nebula's dark "Cosmic Intellectual Horizon"
 * tokens. Names kept as --amber/--amber-dark for minimal-diff continuity;
 * values are the "uzay mavisi" (space blue) brand accent, not amber.
 */
const landingVars = {
  "--paper": "#F1E9D9",
  "--paper2": "#E8DDC6",
  "--navy": "#152343",
  "--navy2": "#1E2F58",
  "--navy3": "#0F1A34",
  "--amber": "#3D5FE0",
  "--amber-dark": "#26399E",
  // Same green used for the panel's .pn-btn--green, kept consistent across
  // the whole product rather than WhatsApp's own (much brighter) brand hex.
  "--green": "#2c7a58",
  "--green-dark": "#194f38",
  "--ink": "#23211C",
  "--ink-soft": "#5A5346",
  "--on-navy": "#EFE7D6",
  "--on-navy-soft": "#A9B6D4",
} as React.CSSProperties;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Archivo/Plex Sans/Plex Mono are already loaded once in the root layout
    // (app/layout.tsx) and their CSS variables cascade down from <html> —
    // no need to redeclare/reload the same Google fonts a second time here.
    <div style={{ ...landingVars, fontFamily: "var(--font-plex-sans)" }}>
      <LandingNavbar />
      <main>{children}</main>
    </div>
  );
}
