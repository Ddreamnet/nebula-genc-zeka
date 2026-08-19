import Image from "next/image";
import Link from "next/link";
import { PanelThemeScope } from "@/components/site/panel-theme-scope";
import { AuthProvider } from "@/contexts/auth-context";
import { landingFontClass } from "@/lib/landing-fonts";

// AuthProvider (client component) creates the browser Supabase client in a
// useMemo initializer, which still runs during the server-rendered pass —
// including at build time, if Next decides this route is static-eligible.
// That means `next build` would need real Supabase env vars just to
// prerender a login page, which some hosts only expose at runtime, not
// during build. Forcing this dynamic defers all rendering (and the
// Supabase client creation inside it) to real request time instead.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div
        className={`panel-theme panel-grid-bg flex min-h-dvh flex-col bg-surface font-sans text-on-surface ${landingFontClass}`}
      >
        <PanelThemeScope />
        {/* Same padding + logo size as landing-navbar.tsx's header (its
           initial, non-condensed state) — the logo sits at the exact same
           on-screen position as the homepage's. */}
        <header style={{ padding: "18px clamp(18px,5vw,64px)" }}>
          <Link
            href="/"
            aria-label="Nebula Genç Zeka — ana sayfa"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <Image
              src="/landing/logo-black.png"
              alt="Nebula Genç Zeka"
              width={1024}
              height={512}
              priority
              style={{ height: "clamp(42px,5.6vw,58px)", width: "auto" }}
            />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 pb-16">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
