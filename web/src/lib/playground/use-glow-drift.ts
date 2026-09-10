import { useEffect, type RefObject } from "react";

/**
 * The random half of the composer light.
 *
 * CSS keyframes alone repeat, however long the period; the eye catches the
 * loop within a minute. So each blob (`.pg-blob` under the ref) also gets a
 * fresh target every 2.6–5.2 seconds from here — a new x, y and scale — and
 * slides to it on its own `transition: transform`, the duration matched to
 * the wait so it never sits still. Two motions stacked (this drift on the
 * wrapper, the keyframe breath on the inner layer) read as smoke, not as a
 * pattern.
 *
 * Cost: four timeouts and one inline `transform` write every few seconds.
 * The transition itself runs on the compositor; nothing here touches
 * layout or paint. Stops while the tab is hidden, and does nothing at all
 * under `prefers-reduced-motion` (the CSS side freezes too).
 */
export function useGlowDrift(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blobs = Array.from(root.querySelectorAll<HTMLElement>(".pg-blob"));
    if (blobs.length === 0) return;

    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const timers = new Set<number>();
    let running = false;

    const hop = (el: HTMLElement) => {
      const ms = Math.round(rand(2600, 5200));
      el.style.transitionDuration = `${ms}ms`;
      // Percentages are of the blob's own box, so the same numbers suit a
      // phone and a desktop; y stays tighter than x because the box is wide.
      // The range is wide enough that a blob genuinely crosses the box —
      // a narrower wander just made the light look like it was vibrating in
      // place, which reads as a loop rather than as drifting smoke.
      el.style.transform = `translate(${rand(-58, 58).toFixed(1)}%, ${rand(-42, 42).toFixed(1)}%) scale(${rand(0.78, 1.4).toFixed(3)})`;
      timers.add(window.setTimeout(() => hop(el), ms));
    };
    const start = () => {
      if (running) return;
      running = true;
      // Staggered first hops, so the four don't all set off together.
      blobs.forEach((el, i) => timers.add(window.setTimeout(() => hop(el), 300 + i * 700)));
    };
    const stop = () => {
      running = false;
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);
}
