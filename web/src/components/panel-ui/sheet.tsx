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
 *    dragged shut by the handle. A phone has no side to slide in from.
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

/** Closes the sheet on a downward drag of the handle (phone only — see useDragToDismiss). */
const DRAG_CLOSE_PX = 96;
const DRAG_CLOSE_VELOCITY = 0.55; // px per ms

/**
 * Drag-to-dismiss for the bottom sheet.
 *
 * Only the handle area (grip + header) is draggable, on purpose: dragging
 * from the body fights the body's own scroll, and every library that tries to
 * arbitrate between the two ends up with a sheet that sometimes scrolls and
 * sometimes closes. A handle that always drags and a body that always scrolls
 * is a rule a thumb can learn in one use.
 *
 * The drag writes `--sheet-drag` on the content node; the closing keyframe
 * starts from that offset, so a release-to-close continues the motion instead
 * of snapping back to zero and then sliding out.
 */
export function useDragToDismiss(
  contentRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  /**
   * For a panel that is NOT unmounted by Radix (the Playground's own floating
   * panels, the structural SideDrawer): the transform it rests at when closed.
   * The release-to-close then animates the node there itself, and only then
   * flips `open` — so the drag and the exit read as one gesture instead of a
   * snap back to zero followed by a slide.
   */
  options: { closedTransform?: string } = {},
) {
  const state = React.useRef<{ y: number; t: number; dy: number; active: boolean; captured: boolean } | null>(null);
  const { closedTransform } = options;

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    // No capture yet: the handle also holds the close button and the `</>`
    // tile, and capturing on pointerdown would retarget the pointerup — the
    // tap's `click` would then land on the handle, not the button. Capture
    // starts only once the finger has actually travelled (see onPointerMove).
    state.current = { y: e.clientY, t: performance.now(), dy: 0, active: true, captured: false };
  }, []);

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    const s = state.current;
    const node = contentRef.current;
    if (!s || !s.active || !node) return;
    const raw = e.clientY - s.y;
    if (!s.captured) {
      if (Math.abs(raw) < 8) return;
      s.captured = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      node.style.transition = "none";
    }
    // Upward drags rubber-band: a sheet that is already at its resting
    // height has nowhere to go, and a rigid stop feels like hitting a wall.
    const dy = raw < 0 ? -Math.sqrt(-raw) * 1.5 : raw;
    s.dy = dy;
    node.style.transform = `translate3d(0, ${dy}px, 0)`;
  }, [contentRef]);

  const onPointerUp = React.useCallback(() => {
    const s = state.current;
    const node = contentRef.current;
    if (!s || !s.active || !node) return;
    s.active = false;
    // A tap, not a drag: nothing to restore, and the button underneath gets
    // its click undisturbed.
    if (!s.captured) return;
    const elapsed = Math.max(1, performance.now() - s.t);
    const velocity = s.dy / elapsed;
    if (s.dy > DRAG_CLOSE_PX || velocity > DRAG_CLOSE_VELOCITY) {
      if (closedTransform) {
        // Finish the slide ourselves, then hand `open` back to the owner. The
        // inline transform is cleared once the node is resting closed, so the
        // class rule alone decides where it sits from then on.
        node.style.transition = "";
        node.style.transform = closedTransform;
        const done = () => {
          node.style.transform = "";
          node.removeEventListener("transitionend", done);
        };
        node.addEventListener("transitionend", done);
        window.setTimeout(done, 400);
        onClose();
        return;
      }
      node.style.setProperty("--sheet-drag", `${Math.max(0, s.dy)}px`);
      node.style.transform = "";
      node.style.transition = "";
      onClose();
      return;
    }
    // Spring back. The transition is on the class; clearing the inline
    // override lets it run for this one return trip.
    node.style.transition = "";
    node.style.transform = "";
  }, [contentRef, onClose, closedTransform]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

/** Where a panel that becomes a bottom sheet rests when closed. */
export const SHEET_CLOSED_TRANSFORM = "translate3d(0, 100%, 0)";

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="sheet-overlay" className={cn("pn-sheet-scrim", className)} {...props} />;
}

interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  size?: SheetSize;
  /**
   * Called when the sheet is dragged shut. Radix owns `open`, so the drag has
   * to ask the owner to flip it; every caller already has an `onOpenChange`.
   */
  onDismiss?: () => void;
}

function SheetContent({ className, children, size = "md", onDismiss, ...props }: SheetContentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = useDragToDismiss(ref, () => onDismiss?.());
  // A drag that closed the sheet leaves `--sheet-drag` behind; the next open
  // must start from the bottom edge, not from wherever the last one let go.
  React.useEffect(() => {
    ref.current?.style.removeProperty("--sheet-drag");
  }, []);
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content ref={ref} data-slot="sheet-content" data-size={size} className={cn("pn-sheet", className)} {...props}>
        {/* The grip only draws below `lg` (CSS). It is part of the handle
            together with the header, so a thumb can grab either. */}
        <div className="pn-sheet-handle" {...drag}>
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
 * The band at the top: title, optional subtitle, the close button, and the
 * caller's own controls (a "copy" button, a tab strip) via `children`.
 * Doubles as the drag handle on a phone.
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
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[color:var(--pn-hair-strong)] bg-surface-container text-on-surface-variant transition-colors duration-[.18s] hover:bg-surface-low pointer-fine:size-8"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

/** The scrolling middle. `data-sheet-scroll` is what the drag handle checks. */
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
 * that ends in "sil". Same surface, same motion as every other sheet.
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
        <AlertDialogPrimitive.Overlay className="pn-sheet-scrim" />
        <AlertDialogPrimitive.Content data-slot="sheet-content" data-size="sm" className="pn-sheet">
          <div className="pn-sheet-handle">
            <span aria-hidden className="pn-sheet-grip" />
          </div>
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
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, ConfirmSheet };
