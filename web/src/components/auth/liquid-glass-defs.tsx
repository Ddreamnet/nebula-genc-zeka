/**
 * Real "liquid glass" refraction filters — feTurbulence generates procedural
 * noise, feDisplacementMap uses it to actually WARP the backdrop (not just
 * blur it), which is the piece that separates liquid glass from plain
 * glassmorphism. Referenced via `backdrop-filter: url(#id) ...` in globals.css.
 *
 * `backdrop-filter: url(#svgFilter)` only composites in Chromium today (Safari/
 * Firefox don't support SVG filters as a backdrop-filter input). Every rule
 * that uses these ids in globals.css declares a plain blur() first and the
 * url() version second — unsupported browsers keep the first (still-glassy)
 * declaration since the second is simply ignored as an invalid value, so this
 * degrades safely everywhere. Purely decorative + static (no per-frame cost).
 */
export function LiquidGlassDefs() {
  return (
    <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
      <defs>
        <filter id="liquid-glass-card" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.010 0.014" numOctaves="2" seed="12" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="60" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="liquid-glass-btn" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025 0.05" numOctaves="2" seed="5" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
