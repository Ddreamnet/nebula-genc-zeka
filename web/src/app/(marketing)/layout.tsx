import { LandingNavbar } from "@/components/landing/landing-navbar";
import { NovaClickBlink } from "@/components/cast/nova-blink";
import { landingVars, legacyAliases } from "@/lib/landing-theme";
import { landingFontClass } from "@/lib/landing-fonts";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo";
import "./landing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${landingFontClass} nb`} style={{ ...landingVars, ...legacyAliases }}>
      {/* Emitted once for the whole public tree rather than per page: these
          two nodes describe the business and the site itself, and every other
          block on the site (@id references in Course, BlogPosting, breadcrumbs)
          points back at them. Not in the ROOT layout, because the dashboard
          and the playground are noindex and have no use for it. */}
      <JsonLd data={[organizationLd, websiteLd]} />
      <LandingNavbar />
      <NovaClickBlink />
      <main>{children}</main>
    </div>
  );
}
