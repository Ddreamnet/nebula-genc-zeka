import { LandingNavbar } from "@/components/landing/landing-navbar";
import { NovaClickBlink } from "@/components/cast/nova-blink";
import { landingVars, legacyAliases } from "@/lib/landing-theme";
import { landingFontClass } from "@/lib/landing-fonts";
import "./landing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${landingFontClass} nb`} style={{ ...landingVars, ...legacyAliases }}>
      <LandingNavbar />
      <NovaClickBlink />
      <main>{children}</main>
    </div>
  );
}
