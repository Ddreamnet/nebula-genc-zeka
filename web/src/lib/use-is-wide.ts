import { useSyncExternalStore } from "react";

/**
 * Whether this viewport gets the desktop surface (a popover, a side drawer)
 * or the phone one (a bottom sheet).
 *
 * `useSyncExternalStore` rather than an effect: the server snapshot is
 * "narrow" — the sheet — and React swaps to the wide surface on hydration
 * without a second render pass of its own. Server-first-narrow is the safer
 * default: a phone that briefly renders a popover is a broken page, a
 * desktop that briefly renders a sheet is a blink.
 */
export function useIsWide(query = "(min-width: 1024px)"): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
