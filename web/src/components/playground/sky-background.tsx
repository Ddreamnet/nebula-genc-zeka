/**
 * The Playground's ground: "Kâğıt Uzay" seen from the paper side.
 *
 * Used only by /playground (every other route paints an opaque surface over
 * it). It was a navy star field until the playground moved onto paper like
 * the rest of the product; it is now the same 26px dot grid the dashboard
 * panels and the marketing sections use, on light blue instead of cream, with
 * a sparse scatter of accent-coloured confetti dots over it so a full screen
 * of grid doesn't read as graph paper. Both layers are painted in CSS
 * (.pg-dots / .pg-confetti in globals.css) — no gradient, no blur, no image.
 */
export function SkyBackground() {
  return (
    <div
      aria-hidden
      // Slightly oversized vs. the viewport (not a flush inset-0) so that on
      // browsers/devices where overscroll-behavior isn't honored, a rubber-band
      // drag past the top/bottom edge still reveals more background instead of
      // a hard, obviously-viewport-sized seam.
      className="pointer-events-none fixed -inset-12 -z-10 overflow-hidden pg-dots"
    >
      <div className="absolute inset-0 pg-confetti" />
    </div>
  );
}
