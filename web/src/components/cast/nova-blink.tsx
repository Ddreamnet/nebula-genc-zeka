"use client";

import { useEffect } from "react";

/**
 * Nova blinks back whenever you tap the page.
 *
 * Mounted once by the marketing layout rather than built into <Nova> so the
 * mascot itself stays a server component: one document-level listener drives
 * every Nova on the page instead of shipping a client bundle per instance.
 *
 * The blink is driven by the Web Animations API, not by toggling a class.
 * The eye group already carries an infinite CSS `nb-blink`, and a second CSS
 * animation on the same property would need the class removed and re-added
 * (plus a forced reflow) to replay on a fast second click. A script-generated
 * animation sorts above CSS animations in the cascade for as long as it runs,
 * then hands the property straight back to the idle loop — so rapid clicks
 * replay cleanly and nothing has to be cleaned up afterwards.
 *
 * The keyframes deliberately match the idle blink's proportions (~195ms to
 * close, ~325ms to open). A snappier reaction blink was tempting, but it reads
 * as a different character tic; Nova should only know how to blink one way.
 */
export function NovaClickBlink() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    /** One in-flight animation per eye group, so a fast double click restarts
     *  rather than stacking two overlapping scaleY runs. */
    const running = new WeakMap<Element, Animation>();

    const blink = () => {
      document.querySelectorAll(".nb-nova__eyes").forEach((eyes) => {
        running.get(eyes)?.cancel();
        running.set(
          eyes,
          eyes.animate(
            [
              { transform: "scaleY(1)", offset: 0 },
              { transform: "scaleY(0.08)", offset: 0.375 },
              { transform: "scaleY(1)", offset: 1 },
            ],
            { duration: 520, easing: "ease-in-out" },
          ),
        );
      });
    };

    // pointerdown rather than click: it fires on touch without the ~300ms
    // wait, and it still fires when the press ends up being a drag or lands
    // on a link that navigates away.
    document.addEventListener("pointerdown", blink);
    return () => document.removeEventListener("pointerdown", blink);
  }, []);

  return null;
}
