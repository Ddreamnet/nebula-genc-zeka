/**
 * Landing-page palette (navy/space-blue/paper), scoped to whatever element it's
 * spread onto rather than declared globally — dashboard/auth keep Nebula's dark
 * "Cosmic Intellectual Horizon" tokens.
 *
 * Lives here rather than inline in the (marketing) layout because the status
 * pages (not-found, error) sit OUTSIDE that route group — they render under the
 * root layout and would otherwise have no --paper/--navy/--amber to resolve, so
 * every color in them would silently fall back to nothing.
 *
 * Names kept as --amber/--amber-dark for minimal-diff continuity; values are the
 * "uzay mavisi" (space blue) brand accent, not amber.
 */
export const landingVars = {
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
