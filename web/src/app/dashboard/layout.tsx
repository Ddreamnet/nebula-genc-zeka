import type { Metadata } from "next";
import { TooltipProvider } from "@/components/panel-ui/tooltip";
import { Toaster } from "@/components/panel-ui/sonner";
import { PanelThemeScope } from "@/components/site/panel-theme-scope";
import { landingFontClass } from "@/lib/landing-fonts";

// Fredoka + Nunito, the "Kâğıt Uzay" pair, shared with the marketing tree via
// one module so next/font dedupes them into a single request instead of this
// route downloading its own copy of Fredoka (which is what it used to do).
// Scoped here rather than in the root layout so Playground pays for neither.

/**
 * Belt-and-braces noindex for everything behind the login.
 *
 * robots.txt already disallows this whole subtree, but a Disallow only stops
 * the crawl — Google will still list a URL it finds linked from elsewhere,
 * with no snippet ("A description for this result is not available"). The
 * meta tag is what actually keeps it out. Both are cheap; the failure modes
 * they cover are different.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className={`panel-theme panel-grid-bg min-h-dvh bg-surface font-sans text-on-surface ${landingFontClass}`}>
        <PanelThemeScope />
        {children}
      </div>
      <Toaster theme="light" position="top-center" />
    </TooltipProvider>
  );
}
