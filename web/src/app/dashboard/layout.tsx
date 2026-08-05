import { Fredoka } from "next/font/google";
import { TooltipProvider } from "@/components/panel-ui/tooltip";
import { Toaster } from "@/components/panel-ui/sonner";
import { PanelThemeScope } from "@/components/site/panel-theme-scope";

// Playful rounded display face for the dashboard's "Hoş geldin" greeting
// only — scoped here (not the root layout) so no other route pays for it.
const fredoka = Fredoka({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className={`panel-theme panel-grid-bg min-h-dvh bg-surface font-sans text-on-surface ${fredoka.variable}`}>
        <PanelThemeScope />
        {children}
      </div>
      <Toaster theme="light" position="top-center" />
    </TooltipProvider>
  );
}
