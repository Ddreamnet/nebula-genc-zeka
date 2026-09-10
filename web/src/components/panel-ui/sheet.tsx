"use client";

import * as React from "react";
import { Dialog as DialogPrimitive, AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Sheet — the one overlay surface the panels and the Playground use.
 *
 * There used to be a centred Dialog for forms, an AlertDialog for confirms, a
 * Popover-as-menu for the model browser and a hand-rolled fixed panel for the
 * Playground's tools; four ways of interrupting the page, each with its own
 * size, radius, motion and close button. This is the replacement for all of
 * them:
 *
 *  · from `lg` up it is a DRAWER that slides in from the right edge and stands
 *    the full height of the window, a card's width away from the edge — the
 *    same silhouette as the panel's own SideDrawer and the Playground's
 *    tools panel, so an overlay reads as "another column" not "a popup";
 *  · below `lg` it is a BOTTOM SHEET: rounded top, a grip, safe-area aware,
 *    dragged shut from anywhere — the card, or the dimmed page above it.
 *
 * Built on Radix Dialog for the parts a hand-rolled overlay always gets
 * wrong — focus trap, `aria-modal`, Escape, scroll lock, portal — while the
 * motion is plain CSS keyed off Radix's `data-state`, so the closing
 * animation actually plays (Radix keeps the node mounted until it ends).
 *
 * `ConfirmSheet` below is the same surface on Radix AlertDialog, for the five
 * "are you sure" moments: a compact sheet with two buttons.
 */

export type SheetTone = "blue" | "mint" | "peach" | "violet" | "pink";
/**
 * Drawer width on desktop / sheet height on a phone.
 *  sm   → 380px / content height     (a confirm, a short form)
 *  md   → 460px / content height     (most forms)         ← default
 *  lg   → 680px / 92dvh               (a list, an editor)
 *  full → min(1100px, 92vw) / 94dvh   (a viewer, the schedule grid)
 */
export type SheetSize = "sm" | "md" | "lg" | "full";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const NARROW = "(max-width: 1023.98px)";
const isNarrow = () => window.matchMedia(NARROW).matches;

/* ------------------------------------------------------------------ */
/* Drag to dismiss                                                     */
/* ------------------------------------------------------------------ */

/** The finger has to travel this far before the gesture is classified. */
const DRAG_DECIDE_PX = 4;
/** A flick faster than this closes regardless of distance (px per ms). */
const CLOSE_VELOCITY = 0.4;
/** Velocity is read over the last stretch of the gesture, not the whole of it. */
const VELOCITY_WINDOW_MS = 100;
/** A list that was still scrolling this recently is being stopped, not dragged. */
const SCROLL_SETTLE_MS = 200;
/** No drag while the entrance is still playing. */
const OPEN_GRACE_MS = 400;
/** iOS's sheet curve (via Ionic, via Vaul): quick out of the gate, long settle. */
const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type DragScrim = React.RefObject<HTMLElement | null> | string;

interface DragState {
  x: number;
  y: number;
  dy: number;
  phase: "undecided" | "drag";
  onScrim: boolean;
  height: number;
  /** A scroller under the finger is scrolled down — a downward drag scrolls it back. */
  scrolledUp: boolean;
  /** A scroller under the finger has more below — an upward drag scrolls it. */
  canScrollOn: boolean;
  samples: { y: number; t: number }[];
}

/** Which way the scrollers between the touch and the sheet's root could move. */
function scrollRoom(target: Element, root: HTMLElement) {
  let up = false;
  let on = false;
  let el: Element | null = target;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === "auto" || oy === "scroll") {
        if (el.scrollTop > 0) up = true;
        if (el.scrollTop + el.clientHeight < el.scrollHeight - 1) on = true;
      }
    }
    el = el.parentElement;
  }
  return { up, on };
}

function recentVelocity(samples: DragState["samples"], now: number) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  // The finger paused before lifting: whatever speed it had is gone.
  if (now - last.t > 80) return 0;
  const first = samples[0];
  return (last.y - first.y) / Math.max(1, last.t - first.t);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Drag-to-dismiss for the bottom sheet — from ANYWHERE.
 *
 * The first version only listened on the grip and the header, to stay out of
 * the body's way. In use that made the sheet feel stuck: a thumb lands in the
 * middle of the card, pulls down, nothing happens. This is the rule native
 * sheets use instead, and the one Vaul (shadcn's drawer) ships:
 *
 *  · a touch that starts on the card, or on the dimmed page above it, may
 *    become a drag;
 *  · it is classified after 4px: sideways → not ours (a chip strip scrolls);
 *    downward while some scroller under the finger is scrolled → a scroll;
 *    downward at the top → a drag; upward with more to scroll → a scroll;
 *    upward with nothing to scroll → a damped drag (rubber band);
 *  · a list still coasting 200ms ago is being stopped, not pulled — that is
 *    the "momentum reaches the top and the sheet flies away" accident;
 *  · once a drag is ours every `touchmove` is `preventDefault`ed, so the
 *    browser never starts a competing scroll; `touch-action: none` on the
 *    root covers the parts that aren't scrollers to begin with.
 *
 * Touch events rather than pointer events on purpose: a browser that decides
 * to scroll cancels the pointer stream, but keeps delivering touches — and
 * the classification has to happen on the first move, before it decides.
 * Mouse users have Escape, the scrim and (on desktop) the close button.
 *
 * Release: a flick faster than 0.4px/ms closes; so does a pull past a quarter
 * of the sheet (48–140px) unless the finger was moving back up. The closing
 * motion continues from where the finger let go, at a duration derived from
 * the remaining distance and the release speed — not a fixed 240ms ease-in
 * that first brakes and then re-accelerates a sheet already in motion.
 *
 * The scrim follows: its alpha is `--scrim-p`, driven here per frame.
 */
export function useDragToDismiss(
  contentRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  options: {
    /** Whether the surface is open. Radix-mounted content can leave it out. */
    open?: boolean;
    /**
     * For a panel that is NOT unmounted by Radix (the Playground's own floating
     * panels, the structural SideDrawer): the transform it rests at when closed.
     * The release-to-close then animates the node there itself, and only then
     * flips `open` — so the drag and the exit read as one gesture.
     */
    closedTransform?: string;
    /** The dimmed page behind the sheet: a tap closes, a downward drag pulls. */
    scrim?: DragScrim;
  } = {},
) {
  const { open = true, closedTransform, scrim } = options;
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    if (!open) return;
    const node = contentRef.current;
    if (!node || !isNarrow()) return;
    const scrimEl = typeof scrim === "string" ? document.querySelector<HTMLElement>(scrim) : (scrim?.current ?? null);
    const openedAt = performance.now();
    let lastScrollAt = 0;
    let s: DragState | null = null;

    const onScroll = () => {
      lastScrollAt = performance.now();
    };

    function onStart(e: TouchEvent) {
      if (s || e.touches.length !== 1) return;
      if (node!.dataset.state === "closed") return;
      if (performance.now() - openedAt < OPEN_GRACE_MS) return;
      const target = e.target as Element | null;
      if (!target) return;
      const onScrim = !!scrimEl && scrimEl.contains(target);
      if (!onScrim) {
        if (!node!.contains(target)) return;
        // Only a control with a touch gesture of its own keeps the finger: a
        // range thumb, a native select, a video scrubber, a rich-text editor
        // (selection). Plain inputs and textareas do NOT — on a form sheet
        // they cover most of the card, and a card that only closes from the
        // gaps between its fields reads as a card that does not close.
        // Losing a half-filled form takes a deliberate quarter-height pull.
        if (target.closest('select, input[type="range"], input[type="file"], video, audio, [contenteditable="true"], [data-no-drag]')) return;
        if (window.getSelection()?.toString()) return;
      }
      const t = e.touches[0];
      const room = onScrim ? { up: false, on: false } : scrollRoom(target, node!);
      s = {
        x: t.clientX,
        y: t.clientY,
        dy: 0,
        phase: "undecided",
        onScrim,
        height: node!.getBoundingClientRect().height,
        scrolledUp: room.up,
        canScrollOn: room.on,
        samples: [],
      };
    }

    function claim() {
      s!.phase = "drag";
      // Kills the entrance keyframe's fill: an animation's values override
      // inline style, so without this the sheet ignores the finger entirely.
      node!.dataset.dragged = "true";
      node!.style.transition = "none";
      if (scrimEl) scrimEl.style.transition = "none";
    }

    function onMove(e: TouchEvent) {
      if (!s) return;
      const t = e.touches[0];
      const raw = t.clientY - s.y;
      const dx = t.clientX - s.x;
      if (s.phase === "undecided") {
        if (Math.abs(raw) < DRAG_DECIDE_PX && Math.abs(dx) < DRAG_DECIDE_PX) return;
        if (Math.abs(dx) > Math.abs(raw)) {
          s = null;
          return;
        }
        if (raw > 0) {
          if (s.scrolledUp || performance.now() - lastScrollAt < SCROLL_SETTLE_MS) {
            s = null;
            return;
          }
        } else if (s.canScrollOn) {
          s = null;
          return;
        }
        claim();
      }
      if (e.cancelable) e.preventDefault();
      // Upward drags rubber-band: a sheet already at its resting height has
      // nowhere to go, and a rigid stop feels like hitting a wall.
      const dy = raw < 0 ? -Math.sqrt(-raw) * 1.5 : raw;
      s.dy = dy;
      const now = performance.now();
      s.samples.push({ y: t.clientY, t: now });
      while (s.samples.length > 2 && now - s.samples[1].t > VELOCITY_WINDOW_MS) s.samples.shift();
      node!.style.transform = `translate3d(0, ${dy}px, 0)`;
      if (scrimEl) scrimEl.style.setProperty("--scrim-p", String(clamp(1 - Math.max(0, dy) / s.height, 0, 1)));
    }

    function springBack() {
      // The transition is on the class; clearing the inline override lets it
      // run for this one return trip. `data-dragged` stays: the entrance
      // keyframe must not come back and pin the transform.
      node!.style.transition = "";
      node!.style.transform = "";
      if (scrimEl) {
        scrimEl.style.transition = "";
        scrimEl.style.removeProperty("--scrim-p");
      }
    }

    function close(dy: number, velocity: number, height: number) {
      const remaining = Math.max(0, height - dy);
      if (closedTransform) {
        // Finish the slide ourselves, then hand `open` back to the owner. The
        // class rule for the closed state hides the node after
        // --pn-dur-sheet-out, so the slide must not outlast it.
        // `data-dragged` stays on for good: an owner with an exit keyframe of
        // its own (the SideDrawer) turns it off under that flag and parks the
        // node at the closed transform instead, so this slide is the only
        // motion — not this slide followed by the keyframe from the top.
        const dur = Math.round(clamp(remaining / Math.max(velocity, 1.4), 150, 240));
        node!.style.transition = `transform ${dur}ms ${SHEET_EASE}`;
        node!.style.transform = closedTransform;
        const done = () => {
          node!.style.transform = "";
          node!.style.transition = "";
          node!.removeEventListener("transitionend", done);
        };
        node!.addEventListener("transitionend", done);
        window.setTimeout(done, dur + 80);
      } else {
        // Radix flips data-state and the closing keyframe takes over from
        // --sheet-drag. The inline transform stays put until then, so there
        // is no frame where the sheet snaps back to the top first.
        const dur = Math.round(clamp(remaining / Math.max(velocity, 1.4), 150, 300));
        node!.style.setProperty("--sheet-drag", `${Math.max(0, dy)}px`);
        node!.style.setProperty("--sheet-out-dur", `${dur}ms`);
      }
      onCloseRef.current();
    }

    function onEnd(e: TouchEvent) {
      if (!s) return;
      const st = s;
      s = null;
      if (st.phase === "undecided") {
        // A tap on the dimmed page: close. (Only a real lift — a cancelled
        // touch is the browser taking the finger for something else.)
        if (st.onScrim && e.type === "touchend") {
          if (e.cancelable) e.preventDefault();
          close(0, 0, st.height);
        }
        return;
      }
      // No synthetic click on whatever ends up under the finger.
      if (e.cancelable) e.preventDefault();
      const velocity = recentVelocity(st.samples, performance.now());
      const threshold = clamp(st.height * 0.25, 48, 140);
      const flick = velocity > CLOSE_VELOCITY;
      const pulled = st.dy > threshold && velocity > -0.15;
      if (e.type === "touchend" && st.dy > 0 && (flick || pulled)) close(st.dy, velocity, st.height);
      else springBack();
    }

    const surfaces = scrimEl ? [node, scrimEl] : [node];
    node.addEventListener("scroll", onScroll, { capture: true, passive: true });
    for (const el of surfaces) {
      el.addEventListener("touchstart", onStart, { passive: true });
      el.addEventListener("touchmove", onMove, { passive: false });
      el.addEventListener("touchend", onEnd, { passive: false });
      el.addEventListener("touchcancel", onEnd, { passive: false });
    }
    return () => {
      node.removeEventListener("scroll", onScroll, { capture: true });
      for (const el of surfaces) {
        el.removeEventListener("touchstart", onStart);
        el.removeEventListener("touchmove", onMove);
        el.removeEventListener("touchend", onEnd);
        el.removeEventListener("touchcancel", onEnd);
      }
      s = null;
    };
  }, [open, contentRef, closedTransform, scrim]);
}

/** Where a panel that becomes a bottom sheet rests when closed. */
export const SHEET_CLOSED_TRANSFORM = "translate3d(0, 100%, 0)";

/**
 * Animates the sheet's height when its content changes size — a list that
 * becomes a form should grow, not jump. FLIP on the content node: the
 * ResizeObserver fires after layout and before paint, so the old height is
 * put back and transitioned to the new one with nothing drawn in between.
 * Phone only; the desktop drawer stands full height regardless.
 */
function useAnimatedHeight(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  React.useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || !isNarrow()) return;
    let last = node.offsetHeight;
    let animating = false;
    const ro = new ResizeObserver(() => {
      if (animating || node.style.height) return;
      const next = node.offsetHeight;
      if (Math.abs(next - last) < 2) {
        last = next;
        return;
      }
      const from = last;
      last = next;
      animating = true;
      node.style.height = `${from}px`;
      void node.offsetHeight;
      node.style.height = `${next}px`;
      const done = (e?: TransitionEvent) => {
        if (e && e.propertyName !== "height") return;
        node.style.height = "";
        animating = false;
        node.removeEventListener("transitionend", done);
      };
      node.addEventListener("transitionend", done);
      window.setTimeout(() => done(), 420);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref, enabled]);
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="sheet-overlay" className={cn("pn-sheet-scrim", className)} {...props} />;
}

interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  size?: SheetSize;
  /**
   * Called when the sheet is dragged shut. Optional: without it the drag
   * presses a hidden Radix Close, which reaches the owner's `onOpenChange`.
   */
  onDismiss?: () => void;
  /** Grow and shrink with the content instead of jumping (phone only). */
  animateHeight?: boolean;
}

/**
 * A ref that also reports whether the node is there. This component renders
 * while the dialog is CLOSED too (Radix's Portal keeps the DOM out until it
 * opens), so an effect keyed on mount alone would run once against a null
 * ref and never again; the hooks below re-run when the content node lands.
 */
function useMountedRef<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const setRef = React.useCallback((el: T | null) => {
    ref.current = el;
    setMounted(!!el);
  }, []);
  return [ref, setRef, mounted] as const;
}

function SheetContent({ className, children, size = "md", onDismiss, animateHeight, onPointerDownOutside, ...props }: SheetContentProps) {
  const [ref, setRef, mounted] = useMountedRef<HTMLDivElement>();
  const overlayRef = React.useRef<HTMLDivElement>(null);
  // Radix owns `open` and exposes no imperative close, but it does expose a
  // Close BUTTON — so a hidden one, clicked, is how a drag closes a sheet
  // whose owner passed no `onDismiss`. Without it the card just froze where
  // the finger let go.
  const closeRef = React.useRef<HTMLButtonElement>(null);
  useDragToDismiss(ref, () => (onDismiss ? onDismiss() : closeRef.current?.click()), { open: mounted, scrim: overlayRef });
  useAnimatedHeight(ref, !!animateHeight && mounted);
  return (
    <SheetPortal>
      <SheetOverlay ref={overlayRef} />
      <DialogPrimitive.Content
        ref={setRef}
        data-slot="sheet-content"
        data-size={size}
        data-animate-height={animateHeight ? "" : undefined}
        className={cn("pn-sheet", className)}
        onPointerDownOutside={(e) => {
          onPointerDownOutside?.(e);
          // On a phone the scrim is a drag surface (see useDragToDismiss): a
          // touch on it must not close the sheet on pointerdown, before it
          // is known whether the finger will pull or just tap. A mouse click
          // outside still closes at once.
          if (!e.defaultPrevented && isNarrow() && (e.detail.originalEvent as PointerEvent).pointerType === "touch") e.preventDefault();
        }}
        {...props}
      >
        <DialogPrimitive.Close asChild>
          <button ref={closeRef} type="button" hidden tabIndex={-1} aria-hidden />
        </DialogPrimitive.Close>
        {/* The grip only draws below `lg` (CSS): the "this can be pulled
            down" affordance, even though the whole card can be. */}
        <div className="pn-sheet-handle">
          <span aria-hidden className="pn-sheet-grip" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

const TONE_BAND: Record<SheetTone, string> = {
  blue: "pn-band--blue",
  mint: "pn-band--mint",
  peach: "pn-band--peach",
  violet: "pn-band--violet",
  pink: "pn-band--pink",
};

/**
 * The band at the top: title, optional subtitle, and the caller's own
 * controls (a "copy" button, a tab strip) via `children`. The close button
 * only draws on the desktop drawer — a phone closes by pulling the card down
 * or tapping the page behind it, and a small ✕ in the corner is the hardest
 * target on the screen for a thumb.
 */
function SheetHeader({
  tone = "blue",
  title,
  subtitle,
  icon,
  children,
  className,
  hideClose,
}: {
  tone?: SheetTone;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** A small mark before the title — the same 32px tile every band uses. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  return (
    <div className={cn("pn-band pn-sheet-head shrink-0", TONE_BAND[tone], className)}>
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <DialogPrimitive.Title className="truncate font-display text-[16px] font-semibold leading-tight text-on-surface">{title}</DialogPrimitive.Title>
        {subtitle ? (
          <DialogPrimitive.Description className="truncate text-[12px] leading-snug text-on-surface-variant">{subtitle}</DialogPrimitive.Description>
        ) : (
          // Radix warns when a Content has no Description; a visually hidden
          // one keeps the reader informed without inventing copy.
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
      </div>
      {children}
      {!hideClose && (
        <DialogPrimitive.Close asChild>
          <button
            type="button"
            aria-label="Kapat"
            className="hidden size-8 shrink-0 place-items-center rounded-[10px] border border-[color:var(--pn-hair-strong)] bg-surface-container text-on-surface-variant transition-colors duration-[.18s] hover:bg-surface-low lg:grid"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

/** The scrolling middle. */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-sheet-scroll className={cn("pn-scroll min-h-0 flex-1 p-4", className)} {...props} />;
}

/** Pinned to the bottom: the form's buttons, a single primary action. */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("pn-sheet-foot flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[color:var(--pn-hair)] px-4 py-3", className)} {...props} />;
}

const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;

/* ------------------------------------------------------------------ */
/* Confirm                                                             */
/* ------------------------------------------------------------------ */

/**
 * "Emin misin?" — a compact sheet with exactly two buttons.
 *
 * Radix AlertDialog underneath: it refuses to close on an outside click and
 * puts focus on the cancel button, which is the right default for a question
 * that ends in "sil". Same surface, same motion as every other sheet — and
 * on a phone the same pull-down, which counts as "Vazgeç".
 */
function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "pink",
  destructive = tone === "pink",
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  tone?: SheetTone;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Anything between the question and the buttons — a note, a preview. */
  children?: React.ReactNode;
}) {
  const confirmClass = destructive ? "pn-btn--pink" : tone === "mint" ? "pn-btn--mint" : tone === "peach" ? "pn-btn--peach" : tone === "violet" ? "pn-btn--violet" : "pn-btn--blue";
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <ConfirmSurface tone={tone} onDismiss={() => !loading && onOpenChange(false)}>
          <div className={cn("pn-band pn-sheet-head shrink-0", TONE_BAND[tone])}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <AlertDialogPrimitive.Title className="font-display text-[16px] font-semibold leading-tight text-on-surface">{title}</AlertDialogPrimitive.Title>
              {description ? (
                <AlertDialogPrimitive.Description className="text-[12px] leading-snug text-on-surface-variant">{description}</AlertDialogPrimitive.Description>
              ) : (
                <AlertDialogPrimitive.Description className="sr-only">{title}</AlertDialogPrimitive.Description>
              )}
            </div>
          </div>
          {children && <div className="p-4 text-[13px] leading-relaxed text-on-surface-variant">{children}</div>}
          <div className="flex items-center justify-end gap-2 px-4 py-3">
            <AlertDialogPrimitive.Cancel asChild>
              <button type="button" className="pn-btn pn-btn--paper" disabled={loading}>
                {cancelLabel}
              </button>
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              className={cn("pn-btn", confirmClass)}
              disabled={loading}
              onClick={async () => {
                await onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </ConfirmSurface>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

/** The confirm's overlay + content pair, so the drag hook has refs to both. */
function ConfirmSurface({ onDismiss, children }: { tone: SheetTone; onDismiss: () => void; children: React.ReactNode }) {
  const [ref, setRef, mounted] = useMountedRef<HTMLDivElement>();
  const overlayRef = React.useRef<HTMLDivElement>(null);
  useDragToDismiss(ref, onDismiss, { open: mounted, scrim: overlayRef });
  return (
    <>
      <AlertDialogPrimitive.Overlay ref={overlayRef} className="pn-sheet-scrim" />
      <AlertDialogPrimitive.Content ref={setRef} data-slot="sheet-content" data-size="sm" className="pn-sheet">
        <div className="pn-sheet-handle">
          <span aria-hidden className="pn-sheet-grip" />
        </div>
        {children}
      </AlertDialogPrimitive.Content>
    </>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, ConfirmSheet };
