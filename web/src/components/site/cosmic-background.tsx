/**
 * The Playground's ground: "Kâğıt Uzay" seen from the space side.
 *
 * Used only by /playground (every other route paints an opaque surface over
 * it). It used to be a stack of radial gradients — a lit dome, three aurora
 * glows and a vignette — which is exactly what the rest of the product stopped
 * doing when it moved onto the cut-paper system. This is the same star field
 * the marketing page's space bands use: one flat navy fill and two painted
 * star layers, the second drifting in opacity. No gradient, no blur.
 */
export function CosmicBackground() {
  return (
    <div
      aria-hidden
      // Slightly oversized vs. the viewport (not a flush inset-0) so that on
      // browsers/devices where overscroll-behavior isn't honored, a rubber-band
      // drag past the top/bottom edge still reveals more background instead of
      // a hard, obviously-viewport-sized seam.
      className="pointer-events-none fixed -inset-12 -z-10 overflow-hidden"
      style={{ background: "#141F3C" }}
    >
      <div className="absolute inset-0 pg-stars" />
      <div className="absolute inset-0 pg-stars pg-stars--twinkle" />
    </div>
  );
}
