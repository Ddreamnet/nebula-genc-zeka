/**
 * NEBULA GENÇ ZEKA — "Kâğıt Uzay" (Paper Space) design system.
 *
 * Paper-dominant: the page surface is warm cream; deep space appears as
 * full-bleed bands (hero, AI panel, closing) rather than as the base layer.
 * Every surface and control is a cut-paper shape — flat fill, thick navy
 * outline, hard offset shadow, no blur, no gradient. That single rule is what
 * makes the site read as one object instead of a stack of unrelated sections.
 *
 * Scoped to whatever element it's spread onto (not :root) because the status
 * pages (not-found, error) render OUTSIDE the (marketing) route group and
 * would otherwise resolve every color to nothing.
 */
export const landingVars = {
  /* ---- Paper surfaces (the default world) ---- */
  "--paper": "#F7F0E1",
  "--paper-raised": "#FFFBF2",
  "--paper-sunken": "#EDE3CF",
  "--paper-line": "#DCCFB4",

  /* ---- Space surfaces (bands only) ---- */
  "--space": "#141F3C",
  "--space-raised": "#1E2E52",
  "--space-deep": "#0B1226",
  "--space-line": "rgba(183,199,235,.22)",

  /* ---- Ink (never pure black — navy reads warmer against cream) ---- */
  "--ink": "#152343",
  "--ink-soft": "#5B6480",
  "--ink-faint": "#8A93AC",
  "--on-space": "#F2ECDD",
  "--on-space-soft": "#A9B6D4",

  /* ---- Accents. Each has a -deep pair used as the hard 3D shadow, so
     every colored control lifts and presses with the same physics. ---- */
  "--blue": "#3D5FE0",
  "--blue-deep": "#2437A6",
  "--amber": "#FF9F45",
  "--amber-deep": "#D2701A",
  "--mint": "#2FD08A",
  "--mint-deep": "#17915B",
  "--coral": "#FF6B8A",
  "--coral-deep": "#CE3B5F",
  "--violet": "#8B6BFF",
  "--violet-deep": "#5D3FD1",

  /* WhatsApp CTA keeps its own green, matched to the panel's .pn-btn--green
     rather than WhatsApp's much brighter brand hex. */
  "--green": "#2c7a58",
  "--green-deep": "#194f38",

  /* ---- Cut-paper geometry. Single source of truth: change the stroke here
     and every card, button and chip on the site changes with it. ---- */
  "--stroke": "3px",
  "--stroke-color": "#152343",
  "--lift": "6px",
  "--radius-card": "22px",
  "--radius-control": "16px",
  "--radius-chip": "999px",
} as React.CSSProperties;

/**
 * Legacy aliases. The previous system named its accent `--amber` while the
 * value was actually blue, and named surfaces `--navy`/`--navy2`/`--paper2`.
 * Auth, blog, legal and status pages still reference those names; mapping them
 * here keeps the whole site on one palette during the rollout instead of
 * leaving half of it resolving to nothing.
 */
export const legacyAliases = {
  "--paper2": "#EDE3CF",
  "--navy": "#141F3C",
  "--navy2": "#1E2E52",
  "--navy3": "#0B1226",
  "--amber-dark": "#2437A6",
  "--green-dark": "#194f38",
  "--on-navy": "#F2ECDD",
  "--on-navy-soft": "#A9B6D4",
} as React.CSSProperties;
