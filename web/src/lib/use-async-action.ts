"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Locks an async action to a single flight: the second click never starts.
 *
 * Two guards, because they catch different things. The ref stops a second
 * call raised in the SAME tick as the first — a real double-click fires both
 * handlers before React has re-rendered anything, so a state flag alone is
 * still `false` on the second one and lets it through. The state is what the
 * button binds its `disabled` and its label to.
 *
 *   const [save, saving] = useAsyncAction(handleSave);
 *   <Button onClick={save} disabled={saving}>{saving ? "..." : "Kaydet"}</Button>
 *
 * Deliberately does NOT swallow errors: the wrapped function keeps whatever
 * try/catch and toast it already had, and this only owns the lock.
 */
export function useAsyncAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown> | unknown) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args: A) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);
      try {
        await fn(...args);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [fn],
  );

  return [run, pending] as const;
}
