import { LandingNavbar } from "@/components/landing/landing-navbar";
import { landingVars } from "@/lib/landing-theme";
import "./landing.css";


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
