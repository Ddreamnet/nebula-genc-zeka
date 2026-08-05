"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/site";

const THEME = {
  dark: { text: "#EFE7D6", border: "rgba(239,231,214,.4)", logo: "/landing/logo-white.png" },
  light: { text: "#152343", border: "rgba(21,35,67,.32)", logo: "/landing/logo-black.png" },
} as const;

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

  // Which section is "current" (drives the dark/light nav color swap) —
  // an IntersectionObserver watching a thin band just below the header,
  // instead of a scroll-driven loop calling getBoundingClientRect() on
  // every section on every frame. This runs off the main thread's
  // scroll-handling path entirely; the browser only calls back when a
  // section actually crosses the band.
  //
  // Depends on `pathname`: this navbar lives in the shared (marketing)
  // layout, so it does NOT remount on client-side navigation between pages
  // (e.g. clicking the logo from /kvkk back to /) — only the page content
  // underneath swaps. Without this dependency the observer set up once for
  // /kvkk's single light section keeps watching those now-detached nodes
  // forever; it never sees the new page's sections, so `theme` gets stuck
  // on whatever the previous page last set (dark navy text stuck on top of
  // the new page's dark navy Hero — unreadable). Re-running this effect
  // per route re-queries the current DOM and re-attaches to what's actually
  // there now.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-navtheme]"));
    if (sections.length === 0) return;

    const headerH = navRef.current?.offsetHeight ?? 90;
    const io = new IntersectionObserver(
      () => {
        // Don't trust which entries the browser happened to report as
        // "changed" this batch — during a boundary crossing both the
        // outgoing and incoming section briefly overlap the thin band at
        // once, and picking via reduce(top <= top) always resolved to
        // whichever section comes earlier in the document (its top is
        // necessarily the more negative one), no matter the actual scroll
        // position. That silently delayed/stuck every dark<->light flip
        // until the outgoing section fully cleared the band. Instead,
        // recompute directly: find whichever observed section's rect
        // actually straddles the header's bottom edge right now — that's
        // unambiguous and only runs on the rare frames this callback fires.
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
  const btnStyle: React.CSSProperties = {
    color: t.text,
    borderColor: t.border,
    // Without this, this button's color/border snapped instantly on every
    // dark<->light flip while the nav links next to it (which do declare a
    // transition) faded smoothly — same underlying state change, visibly
    // inconsistent motion, easy to read as "the transition is glitching".
    transition: "color .3s ease, border-color .3s ease",
  };

  return (
    <>
      {/* Both logo variants preloaded so the very first dark<->light flip
          doesn't pop in a not-yet-fetched image over an already-updated
          header — the swap is a full <img> src change (no crossfade),
          so whichever variant hasn't loaded yet would flash in late. */}
      <link rel="preload" as="image" href={THEME.dark.logo} />
      <link rel="preload" as="image" href={THEME.light.logo} />
      <header
        ref={navRef}
        data-nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "transparent",
          padding: condensed ? "11px clamp(18px,5vw,64px)" : "18px clamp(18px,5vw,64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          transition: "padding .3s ease",
        }}
      >
        <Link
          href={logoHref}
          aria-label="Nebula Genç Zeka ana sayfa"
          className="nl-nav-logo"
          data-condensed={condensed}
          style={{ display: "flex", alignItems: "center" }}
        >
          <Image
            src={t.logo}
            alt="Nebula Genç Zeka"
            width={220}
            height={58}
            priority
            style={{ height: "clamp(42px,5.6vw,58px)", width: "auto" }}
          />
        </Link>

        <nav
          style={{
            alignItems: "center",
            gap: "clamp(18px,2.6vw,34px)",
            fontFamily: "var(--font-plex-mono)",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: ".04em",
          }}
          className="hidden md:flex"
        >
          {siteConfig.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: t.text,
                transition: "color .3s ease",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/giris" className="nl-btn nl-btn--sm nl-btn--amber hidden md:inline-flex">
            Giriş yap
          </Link>
          <Link href="/giris" aria-label="Giriş yap" className="nl-icon-btn nl-icon-btn--amber inline-flex md:hidden">
            <ArrowRight className="size-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            className="nl-icon-btn inline-flex md:hidden"
            style={btnStyle}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {open && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            inset: "0 0 0 0",
            // Static value matching the header's real (measured) height at
            // mobile widths, where this menu is the only thing that uses
            // it — replaces a JS-measured CSS var that was updated via a
            // ResizeObserver watching the header's content-box, which never
            // actually fired for the condense/expand padding change (that
            // only affects the border-box), so it was silently always
            // falling back to this same kind of static value anyway.
            top: "clamp(78px, 11vw, 90px)",
            zIndex: 40,
            background: "var(--navy)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "24px clamp(18px,5vw,64px)" }}>
            {siteConfig.nav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{
                  color: "var(--on-navy)",
                  fontFamily: "var(--font-plex-mono)",
                  fontSize: 18,
                  padding: "14px 4px",
                  borderBottom: "1px solid rgba(169,182,212,.14)",
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="nl-btn nl-btn--lg nl-btn--amber"
                style={{ justifyContent: "center", textAlign: "center" }}
              >
                Giriş yap
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
