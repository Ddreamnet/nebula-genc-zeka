"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { PaperButton } from "@/components/ui/paper-button";
import { Star } from "@/components/cast/props";

const THEME = {
  dark: { text: "var(--on-space)", logo: "/landing/logo-white.png" },
  light: { text: "var(--ink)", logo: "/landing/logo-black.png" },
} as const;

/**
 * The exact srcset next/image emits for the header logo below.
 *
 * With no `sizes` prop, next/image builds a two-entry `x`-descriptor set from
 * the declared `width`: the smallest configured size >= width for 1x, and the
 * smallest >= width*2 for 2x. width={220} against Next's default size list
 * (…128, 256, 384, 640…) resolves to 256 and 640, and quality defaults to 75.
 * Kept next to the <Image> that has to match it — if these ever drift apart
 * the only symptom is a preload the browser reports as unused, never a broken
 * image.
 */
function logoSrcSet(src: string): string {
  const at = (w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
  return `${at(256)} 1x, ${at(640)} 2x`;
}

export function LandingNavbar() {
  const pathname = usePathname();
  // "#top" only exists on the homepage (Hero's own id) — on every other
  // route (kvkk, gizlilik, blog, ...) that hash just gets appended to the
  // current URL with nothing to scroll to, so the logo would look dead.
  const logoHref = pathname === "/" ? "#top" : "/";
  const navRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);

  // "Condensed" is a single cheap threshold on window.scrollY, which never
  // forces layout (unlike getBoundingClientRect/offsetHeight) — safe to
  // read on every rAF tick even while a scroll-driven transition elsewhere
  // is running.
  useEffect(() => {
    let ticking = false;
    function update() {
      ticking = false;
      setCondensed((window.scrollY || 0) > 40);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Which section is "current" (drives the dark/light nav color swap) — an
  // IntersectionObserver watching a thin band just below the header. Re-run
  // per route: a client-side navigation swaps the DOM under an observer that
  // is still attached to the old page's sections, so `theme` would otherwise
  // stick on whatever the previous page last set.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-navtheme]"));
    if (sections.length === 0) return;

    const headerH = navRef.current?.offsetHeight ?? 90;
    const io = new IntersectionObserver(
      () => {
        // Don't trust which entries the browser reported as changed this
        // batch — during a boundary crossing both the outgoing and incoming
        // section briefly overlap the band. Recompute directly: whichever
        // observed section straddles the header's bottom edge right now is
        // unambiguously the current one.
        const liveHeaderH = navRef.current?.offsetHeight ?? headerH;
        const current = sections.find((s) => {
          const rect = s.getBoundingClientRect();
          return rect.top <= liveHeaderH && rect.bottom > liveHeaderH;
        });
        if (!current) return;
        setTheme(current.dataset.navtheme === "light" ? "light" : "dark");
      },
      { rootMargin: `-${headerH}px 0px -70% 0px`, threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const t = THEME[theme];

  return (
    <>
      {/* Both logo variants preloaded so the very first dark<->light flip
          doesn't pop in a not-yet-fetched image over an already-updated
          header — the swap is a full <img> src change (no crossfade), so
          whichever variant hasn't loaded yet would flash in late.

          These MUST point at the same URLs <Image> will actually request, not
          at the files in /public. Preloading the raw PNGs warmed two cache
          entries the page then never touched: 57 KB fetched at preload
          priority, competing with the hero's own fonts and CSS, while the
          <img> went off and fetched /_next/image separately anyway — so the
          flash these are here to prevent was never actually prevented. */}
      <link rel="preload" as="image" imageSrcSet={logoSrcSet(THEME.dark.logo)} />
      <link rel="preload" as="image" imageSrcSet={logoSrcSet(THEME.light.logo)} />

      <header
        ref={navRef}
        data-nav
        data-theme={theme}
        data-condensed={condensed}
        className="nb-header"
      >
        <Link
          href={logoHref}
          aria-label="Nebula Genç Zeka ana sayfa"
          className="nb-nav-logo"
          data-condensed={condensed}
        >
          <Image
            src={t.logo}
            alt="Nebula Genç Zeka"
            width={220}
            height={58}
            priority
            style={{ height: "clamp(40px,5.4vw,54px)", width: "auto" }}
          />
        </Link>

        <nav
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "clamp(20px,2.8vw,36px)" }}
        >
          {siteConfig.nav.map((link) => (
            <a key={link.href} href={link.href} className="nb-nav-link" style={{ color: t.text }}>
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PaperButton href="/giris" tone="amber" size="sm" className="hidden md:inline-flex">
            Giriş yap
          </PaperButton>
          <PaperButton
            href="/giris"
            tone="amber"
            size="sm"
            icon
            aria-label="Giriş yap"
            className="md:hidden"
          >
            <ArrowRight className="size-5" />
          </PaperButton>
          <PaperButton
            tone={theme === "dark" ? "ghost-space" : "paper"}
            size="sm"
            icon
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            className="md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </PaperButton>
        </div>
      </header>

      {open && (
        <div
          className="md:hidden nb-space nb-on-space"
          style={{
            position: "fixed",
            // Matches the header's real height at mobile widths, where this
            // menu is the only thing that needs it.
            inset: "clamp(74px, 11vw, 88px) 0 0",
            zIndex: 40,
            overflowY: "auto",
          }}
        >
          <div className="nb-stars" aria-hidden />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "28px clamp(18px,5vw,64px) 40px",
            }}
          >
            {siteConfig.nav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="nb-card nb-card--live nb-card--space"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "18px 20px",
                  fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
                  fontWeight: 500,
                  fontSize: 20,
                  color: "var(--on-space)",
                }}
              >
                <Star className="size-[16px] shrink-0" color="#FF9F45" outlined={false} />
                {link.label}
              </a>
            ))}
            <PaperButton
              href="/giris"
              tone="amber"
              size="lg"
              onClick={() => setOpen(false)}
              style={{ marginTop: 12 }}
            >
              Giriş yap
            </PaperButton>
          </div>
        </div>
      )}
    </>
  );
}
