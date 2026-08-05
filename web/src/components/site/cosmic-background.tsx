/**
 * Fixed, non-interactive deep-space background shared by every page.
 * Pure CSS — no client JS. GPU-cheap: only opacity animates (one twinkle layer).
 */
export function CosmicBackground() {
  return (
    <div
      aria-hidden
      // Slightly oversized vs. the viewport (not a flush inset-0) so that on
      // browsers/devices where overscroll-behavior isn't honored, a rubber-band
      // drag past the top/bottom edge still reveals more background instead of
      // a hard, obviously-viewport-sized seam.
      className="pointer-events-none fixed -inset-12 -z-10 overflow-hidden bg-surface"
    >
      {/* Deep radial base — slightly lit from the top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 120% at 50% -10%, #171b1d 0%, #0e1011 45%, #070909 100%)",
        }}
      />

      {/* Nebula aurora glows (amber + cosmic blue) */}
      <div className="absolute inset-0 aurora opacity-90" />

      {/* Two starfield layers — the second gently twinkles */}
      <div className="absolute inset-0 starfield opacity-70" />
      <div
        className="absolute inset-0 starfield opacity-50 animate-twinkle"
        style={{ backgroundPosition: "140px 90px, 60px 40px, 200px 120px, 30px 220px, 180px 60px, 90px 150px" }}
      />

      {/* Vignette to focus content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 70% at 50% 38%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
