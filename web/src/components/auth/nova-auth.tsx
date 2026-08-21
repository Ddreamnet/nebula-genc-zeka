"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type MascotState = "idle" | "covering" | "peeking";

/** Matches the viewBox width below — used to convert screen px to user units. */
const VIEWBOX_W = 200;

/**
 * How far a pupil may travel from the centre of its light, in user units.
 * The light is a 21×26 rounded rect (rx 10.5) and the pupil is r=5, so 5 is
 * the largest offset that still keeps the whole pupil inside the amber.
 */
const MAX_PUPIL_OFFSET = 5;

/** Cursor-follow smoothing. Same figure the previous mascot used. */
const LERP = 0.25;

const INK = "#152343";
const SUIT = "#FFFBF2";
const SUIT_SHADE = "#E7DCC6";
const VISOR = "#101B38";
const AMBER = "#FF9F45";
const MINT = "#2FD08A";

/**
 * NOVA, login edition.
 *
 * The login page used to be greeted by a different character entirely — a
 * "mad-genius space scientist" with a face, hair and gloves. It behaved
 * beautifully (eyes tracked the cursor, hands covered them when the password
 * field had focus) but it meant the product introduced a second mascot the
 * moment you left the marketing site. This is that same behaviour, rebuilt on
 * Nova so there is one character everywhere.
 *
 * One deliberate departure from Nova's canon, and only here: her amber visor
 * lights get **pupils**. Everywhere else the rule is "no face inside the
 * visor" and the two flat lights carry every expression — but a light with no
 * pupil cannot look at anything, and cursor-tracking is the whole charm of
 * this screen. So the lights become eyes on this one page. The rest of the
 * canon is untouched: opaque visor, no mouth, no brows, one navy outline
 * weight, flat fills, no gradients.
 *
 * Behaviour parity with the character it replaces:
 *   · idle      — hands down, pupils follow the cursor
 *   · covering  — password focused: both arms swing up flat over the visor
 *   · peeking   — password revealed: arms swing out beside the helmet, pupils widen
 *   · shakeSignal — bump the number to play a "no" head-shake
 *
 * Perf: the cursor follow writes `transform` straight to two refs inside a rAF
 * loop, so moving the mouse never re-renders React. The shake and the blink
 * run on the Web Animations API. Everything is transform-only.
 */
export function NovaAuth({
  state = "idle",
  shakeSignal = 0,
  className,
}: {
  state?: MascotState;
  shakeSignal?: number;
  className?: string;
}) {
  const covering = state === "covering" || state === "peeking";
  const peeking = state === "peeking";

  const svgRef = useRef<SVGSVGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const leftPupilRef = useRef<SVGGElement>(null);
  const rightPupilRef = useRef<SVGGElement>(null);
  const coveringRef = useRef(covering);
  /** Set by the cursor-follow effect below; lets a state change re-arm its
   *  now-demand-driven rAF loop. */
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    coveringRef.current = covering;
    wakeRef.current?.();
  }, [covering]);

  // ---- Pupils follow the cursor (direct DOM writes — no React in the hot path) ----
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let center = { x: 0, y: 0, scale: 1 };
    let dirty = true;
    const mouse = { x: -9999, y: -9999 };
    const cur = { x: 0, y: 0 };
    let raf = 0;

    const measure = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0) {
        center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          scale: rect.width / VIEWBOX_W,
        };
        dirty = false;
      }
    };

    // The loop is demand-driven rather than free-running. It used to schedule
    // a frame unconditionally, forever — so a login page sitting untouched
    // still woke the main thread 60 times a second to re-write two identical
    // SVG transforms, which on an SVG child is a repaint of the whole mascot
    // each time. Now anything that can move the pupils (a pointer move, a
    // scroll, a resize, the arms coming down) calls wake(), and the loop
    // parks itself again as soon as the lerp has converged. The visible
    // behaviour is unchanged: the same easing, the same landing position.
    const EPSILON = 0.01;
    let running = false;

    const tick = () => {
      if (dirty) measure();
      let settled = true;
      if (!coveringRef.current && center.scale > 0) {
        const dx = (mouse.x - center.x) / center.scale;
        const dy = (mouse.y - center.y) / center.scale;
        const dist = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(MAX_PUPIL_OFFSET, dist * 0.06);
        const tx = (dx / dist) * clamped;
        const ty = (dy / dist) * clamped;
        cur.x += (tx - cur.x) * LERP;
        cur.y += (ty - cur.y) * LERP;
        // Both pupils share one offset: they are looking at the same point,
        // and the previous mascot's separate lerp state for each never
        // diverged either.
        const t = `translate(${cur.x}px, ${cur.y}px)`;
        leftPupilRef.current?.style.setProperty("transform", t);
        rightPupilRef.current?.style.setProperty("transform", t);
        settled = Math.abs(tx - cur.x) < EPSILON && Math.abs(ty - cur.y) < EPSILON;
      }
      if (settled) {
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      wake();
    };
    const onDirty = () => {
      dirty = true;
      wake();
    };

    // The arms dropping/lifting flips coveringRef, and the frame after that is
    // the one that has to re-aim the pupils — so the same element the arms
    // animate on is what re-arms the loop.
    wakeRef.current = wake;

    measure();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onDirty);
    window.addEventListener("scroll", onDirty, { passive: true });
    wake();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      wakeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onDirty);
      window.removeEventListener("scroll", onDirty);
    };
  }, []);

  // ---- Blink. Driven here rather than from landing.css, which this route
  //      never loads. Same 3.25s cycle and same lid timing as the homepage,
  //      plus the click-to-blink the marketing pages have. ----
  useEffect(() => {
    const eyes = eyesRef.current;
    if (!eyes || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lid = [
      { transform: "scaleY(1)", offset: 0 },
      { transform: "scaleY(1)", offset: 0.84 },
      { transform: "scaleY(0.08)", offset: 0.9 },
      { transform: "scaleY(1)", offset: 1 },
    ];

    const idle = eyes.animate(lid, { duration: 3250, iterations: Infinity, easing: "ease-in-out" });

    let onDemand: Animation | undefined;
    const blinkNow = () => {
      onDemand?.cancel();
      onDemand = eyes.animate(
        [
          { transform: "scaleY(1)" },
          { transform: "scaleY(0.08)", offset: 0.375 },
          { transform: "scaleY(1)" },
        ],
        { duration: 520, easing: "ease-in-out" },
      );
    };
    document.addEventListener("pointerdown", blinkNow);

    return () => {
      idle.cancel();
      onDemand?.cancel();
      document.removeEventListener("pointerdown", blinkNow);
    };
  }, []);

  // ---- "No" head-shake on invalid credentials ----
  const lastShake = useRef(0);
  useEffect(() => {
    if (shakeSignal === 0 || shakeSignal === lastShake.current) return;
    lastShake.current = shakeSignal;
    headRef.current?.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-9deg)" },
        { transform: "rotate(8deg)" },
        { transform: "rotate(-6deg)" },
        { transform: "rotate(5deg)" },
        { transform: "rotate(-2deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 520, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" },
    );
  }, [shakeSignal]);

  const armTransition = "transform .45s cubic-bezier(0.16, 1, 0.3, 1)";

  // Each arm is one group that pivots at the shoulder, so the three states are
  // a single angle and the hand can never detach from the body mid-transition.
  // The arms are drawn in the covering position, which makes 0° the truth and
  // the other two states rotations away from it:
  //   0°    hands flat over the visor
  //   -55°  swung out beside the helmet — the lights are visible again
  //   -165° hanging at her sides, clear of the torso and the chest panel
  // (Right arm mirrors the sign.) An earlier version translated free-floating
  // mittens instead; they read as two objects hovering in front of her.
  const armAngle = covering ? (peeking ? 55 : 0) : 165;

  // Pupils peek upward while the visor is covered, and widen once the password
  // is revealed — the same two tells the previous mascot used.
  const pupilDy = covering && !peeking ? -2.5 : 0;
  const pupilR = peeking ? 5.6 : 5;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 236"
      className={cn("block overflow-visible", className)}
      role="img"
      aria-label="Nova, Nebula'nın astronotu"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Antenna. Two strokes so the navy line stays visible on any ground. */}
      <path d="M134 38L164 12" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M134 38L164 12" stroke={SUIT} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={166} cy={11} r={9} fill={AMBER} stroke={INK} strokeWidth={6} />

      {/* Life-support pack behind the torso */}
      <rect x={62} y={112} width={76} height={62} rx={24} fill={SUIT_SHADE} stroke={INK} strokeWidth={7} />

      {/* Legs — standing pose */}
      <Leg d="M88 174L88 202" boot="M89 206L74 206" />
      <Leg d="M112 174L112 202" boot="M111 206L126 206" />

      {/* Torso */}
      <rect x={66} y={108} width={68} height={78} rx={27} fill={SUIT} stroke={INK} strokeWidth={7} />

      {/* Chest panel */}
      <rect x={83} y={132} width={34} height={26} rx={8} fill={SUIT} stroke={INK} strokeWidth={5} />
      <circle cx={93} cy={141} r={3.6} fill={MINT} />
      <circle cx={93} cy={150} r={3.6} fill={AMBER} />
      <rect x={101} y={139} width={11} height={4} rx={2} fill={INK} opacity={0.35} />
      <rect x={101} y={147} width={8} height={4} rx={2} fill={INK} opacity={0.22} />

      {/* Head group: helmet, visor and eyes. Pivots at the neck for the shake. */}
      <g ref={headRef} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <ellipse cx={46} cy={74} rx={11} ry={17} fill={SUIT} stroke={INK} strokeWidth={7} />
        <ellipse cx={154} cy={74} rx={11} ry={17} fill={SUIT} stroke={INK} strokeWidth={7} />
        <circle cx={100} cy={72} r={56} fill={SUIT} stroke={INK} strokeWidth={7} />
        <circle cx={100} cy={72} r={43} fill={VISOR} />

        {/* Eyes. The wide low-opacity plate behind each light fakes a glow with
            a flat shape; a real blur would re-rasterize on every blink frame. */}
        <g ref={eyesRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <rect x={72} y={56} width={27} height={32} rx={13} fill={AMBER} opacity={0.22} />
          <rect x={101} y={56} width={27} height={32} rx={13} fill={AMBER} opacity={0.22} />
          <rect x={75} y={59} width={21} height={26} rx={10.5} fill={AMBER} />
          <rect x={104} y={59} width={21} height={26} rx={10.5} fill={AMBER} />

          {/* Pupils — the one place Nova is allowed a face, and only here. */}
          <g ref={leftPupilRef}>
            <circle cx={85.5} cy={72 + pupilDy} r={pupilR} fill={VISOR} />
            <circle cx={87.3} cy={70 + pupilDy} r={1.6} fill="#FFFFFF" opacity={0.85} />
          </g>
          <g ref={rightPupilRef}>
            <circle cx={114.5} cy={72 + pupilDy} r={pupilR} fill={VISOR} />
            <circle cx={116.3} cy={70 + pupilDy} r={1.6} fill="#FFFFFF" opacity={0.85} />
          </g>
        </g>

        {/* Visor star reflection — Nova's signature. */}
        <path
          d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z"
          fill="#FFFFFF"
          opacity={0.95}
        />
      </g>

      {/* Arms. Outside the head group on purpose: the hands must not shake
          along with the helmet. */}
      <Arm side="left" angle={-armAngle} transition={armTransition} />
      <Arm side="right" angle={armAngle} transition={armTransition} />
    </svg>
  );
}

/** Nova's tube leg: navy outline stroke, cream stroke over it, amber boot. */
function Leg({ d, boot }: { d: string; boot: string }) {
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={25} strokeLinecap="round" fill="none" />
      <path d={d} stroke={SUIT} strokeWidth={18} strokeLinecap="round" fill="none" />
      <path d={boot} stroke={INK} strokeWidth={29} strokeLinecap="round" fill="none" />
      <path d={boot} stroke={AMBER} strokeWidth={22} strokeLinecap="round" fill="none" />
    </g>
  );
}

/**
 * One arm: Nova's usual two-stroke tube from the shoulder to the wrist, then a
 * mitten wide enough to cover an eye, its finger seams, and the amber cuff she
 * wears at every wrist.
 *
 * The whole group pivots at the shoulder via transform-box: view-box, so the
 * angle is expressed in the same user units as the geometry above it.
 */
function Arm({
  side,
  angle,
  transition,
}: {
  side: "left" | "right";
  angle: number;
  transition: string;
}) {
  const left = side === "left";
  const shoulder = { x: left ? 76 : 124, y: 124 };
  const wrist = { x: left ? 84 : 116, y: 100 };
  /** Left edge of the mitten paddle. */
  const px = left ? 66 : 98;
  const tube = `M${shoulder.x} ${shoulder.y}L${wrist.x} ${wrist.y}`;

  return (
    <g
      style={{
        transform: `rotate(${angle}deg)`,
        transformBox: "view-box",
        transformOrigin: `${shoulder.x}px ${shoulder.y}px`,
        transition,
      }}
    >
      <path d={tube} stroke={INK} strokeWidth={26} strokeLinecap="round" fill="none" />
      <path d={tube} stroke={SUIT} strokeWidth={19} strokeLinecap="round" fill="none" />
      <rect x={px} y={52} width={36} height={44} rx={18} fill={SUIT} stroke={INK} strokeWidth={6} />
      <path
        d={`M${px + 12} 60L${px + 12} 88M${px + 24} 60L${px + 24} 88`}
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.3}
      />
      <rect x={px + 1} y={86} width={34} height={13} rx={6.5} fill={AMBER} stroke={INK} strokeWidth={5} />
    </g>
  );
}
