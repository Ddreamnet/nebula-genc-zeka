import { cn } from "@/lib/cn";

/**
 * Nova's world — the small cut-paper objects that float around her.
 *
 * Same rules as <Nova>: flat fills, one navy outline weight, no gradients.
 * Each one takes its viewBox at a square-ish ratio so it can be dropped at any
 * size, and none of them animate on their own — motion comes from the
 * `.nb-float` / `.nb-drift` classes applied at the call site, which keeps the
 * stagger decision with the layout that needs it.
 */

const INK = "#152343";

/** The four-pointed star. Used as bullet, accent, and confetti everywhere. */
export function Star({
  className,
  style,
  color = "#FF9F45",
  outlined = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  outlined?: boolean;
}) {
  return (
    <svg viewBox="0 0 48 48" className={cn("block", className)} style={style} fill="none" aria-hidden>
      <path
        d="M24 2l5.6 15.2L44.8 24l-15.2 6.8L24 46l-5.6-15.2L3.2 24l15.2-6.8z"
        fill={color}
        stroke={outlined ? INK : undefined}
        strokeWidth={outlined ? 3.5 : undefined}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ringed planet. The ring passes behind the body, which is the whole reason
 *  it's two arcs rather than one ellipse. */
export function Planet({
  className,
  style,
  color = "#8B6BFF",
}: {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 96 76" className={cn("block", className)} style={style} fill="none" aria-hidden>
      <path d="M12 46a40 13 -18 0 0 72-22" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <circle cx={48} cy={38} r={26} fill={color} stroke={INK} strokeWidth={4.5} />
      <circle cx={39} cy={30} r={6} fill="#FFFFFF" opacity={0.28} />
      <circle cx={57} cy={45} r={4} fill="#FFFFFF" opacity={0.2} />
      <path d="M84 24a40 13 -18 0 1 -72 22" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M84 24a40 13 -18 0 1 -72 22" stroke="#FFD27A" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

/** Comet — the "progress" prop. A solid tapered tail, not three thin lines:
 *  at prop size (under 120px) hairline strokes read as stray marks. */
export function Comet({
  className,
  style,
  color = "#2FD08A",
}: {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 96 72" className={cn("block", className)} style={style} fill="none" aria-hidden>
      <path
        d="M62 16 6 66l30-8 4 12 12-14 14 6z"
        fill={color}
        stroke={INK}
        strokeWidth={4.5}
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle cx={68} cy={22} r={17} fill={color} stroke={INK} strokeWidth={5} />
      <circle cx={62} cy={16} r={5} fill="#FFFFFF" opacity={0.45} />
    </svg>
  );
}

/**
 * Rocket — the "we're going somewhere" prop. Reads at any size, which a comet
 * does not, so this is the one the hero uses.
 */
export function Rocket({
  className,
  style,
  body = "#FFFBF2",
  fin = "#FF6B8A",
  window: win = "#3D5FE0",
}: {
  className?: string;
  style?: React.CSSProperties;
  body?: string;
  fin?: string;
  window?: string;
}) {
  return (
    <svg viewBox="0 0 72 112" className={cn("block", className)} style={style} fill="none" aria-hidden>
      <path d="M18 56 4 84l18-6z" fill={fin} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M54 56 68 84l-18-6z" fill={fin} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      <path
        d="M36 4c14 14 20 34 18 56v18H18V60C16 38 22 18 36 4z"
        fill={body}
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <circle cx={36} cy={42} r={11} fill={win} stroke={INK} strokeWidth={4.5} />
      <circle cx={32} cy={38} r={3.4} fill="#FFFFFF" opacity={0.6} />
      <path d="M22 82h28" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M26 86q10 22 20 0z" fill="#FF9F45" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M31 88q5 11 10 0z" fill="#FFD27A" />
    </svg>
  );
}

/**
 * BIT — Nova's sidekick. A one-eyed cube drone that stands in wherever the
 * subject is "the machine": the AI panel, the code card, empty states. Kept
 * deliberately simpler than Nova so the two never compete for attention.
 */
export function Bit({
  className,
  style,
  color = "#3D5FE0",
  eyeColor = "#9BE7FF",
}: {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  eyeColor?: string;
}) {
  return (
    <svg viewBox="0 0 96 104" className={cn("block", className)} style={style} fill="none" aria-hidden>
      <path d="M48 20L48 8" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <circle cx={48} cy={7} r={7} fill="#FF9F45" stroke={INK} strokeWidth={4.5} />
      <rect x={4} y={44} width={16} height={26} rx={8} fill={color} stroke={INK} strokeWidth={5} />
      <rect x={76} y={44} width={16} height={26} rx={8} fill={color} stroke={INK} strokeWidth={5} />
      <rect x={16} y={20} width={64} height={64} rx={22} fill={color} stroke={INK} strokeWidth={5} />
      <rect x={28} y={38} width={40} height={28} rx={14} fill={INK} />
      <circle cx={48} cy={52} r={9} fill={eyeColor} />
      <circle cx={44} cy={48} r={3} fill="#FFFFFF" opacity={0.9} />
      <rect x={34} y={74} width={28} height={5} rx={2.5} fill={INK} opacity={0.35} />
    </svg>
  );
}

/**
 * Nova talking.
 *
 * Deliberately not <PromptBubble>: that one is mono-spaced and carries a star,
 * because it represents something *typed into a machine*. This is a character
 * speaking, so it's set in the display face and the tail points down at Nova.
 *
 * Nova's rules, which are what keep her from turning into a second marketing
 * voice: lowercase, six words at most, never sells anything, never says
 * "yapay zeka", and always talks to the child even on a section written for
 * the parent. That split is the point — the headline addresses the parent,
 * Nova addresses the kid reading over their shoulder.
 */
export function NovaSays({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("nb-says", className)}
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: 210,
        padding: "11px 15px 12px",
        background: "var(--paper-raised)",
        border: "var(--stroke) solid var(--stroke-color)",
        borderRadius: 18,
        boxShadow: "0 5px 0 0 var(--stroke-color)",
        fontFamily: "var(--font-fredoka), ui-sans-serif, sans-serif",
        fontWeight: 500,
        fontSize: 14.5,
        lineHeight: 1.35,
        color: "var(--ink)",
        ...style,
      }}
    >
      {text}
      {/* Tail: a rotated square tucked under the bubble, drawn with the same
          two borders so it inherits the cut-paper edge instead of needing its
          own outline shape. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 26,
          bottom: -9,
          width: 14,
          height: 14,
          background: "var(--paper-raised)",
          borderRight: "var(--stroke) solid var(--stroke-color)",
          borderBottom: "var(--stroke) solid var(--stroke-color)",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

/**
 * A chat bubble carrying a prompt. This is the site's shorthand for "the
 * child types an instruction" and appears wherever we show AI being used
 * rather than described.
 */
export function PromptBubble({
  className,
  style,
  text,
  color = "#FFFBF2",
}: {
  className?: string;
  style?: React.CSSProperties;
  text: string;
  color?: string;
}) {
  return (
    <div
      className={cn("nb-prompt", className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 280,
        padding: "12px 16px",
        background: color,
        border: "var(--stroke) solid var(--stroke-color)",
        borderRadius: "18px 18px 18px 6px",
        boxShadow: "0 5px 0 0 var(--stroke-color)",
        fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
        fontSize: 13,
        lineHeight: 1.35,
        color: "var(--ink)",
        ...style,
      }}
    >
      <Star className="size-[15px] shrink-0" color="#FF9F45" />
      <span>{text}</span>
    </div>
  );
}
