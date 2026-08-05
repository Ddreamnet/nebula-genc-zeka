"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type MascotState = "idle" | "covering" | "peeking";

const VIEWBOX_W = 240;
const MAX_PUPIL_OFFSET = 6.5; // user units — sclera rx=14/ry=15, pupil r=6-7, safe margin
const LERP = 0.25;

/**
 * Original "mad-genius space scientist" mascot (Nebula-owned, no IP risk).
 * - idle: hands down, eyes follow the cursor
 * - covering: password focused → hands rise over the eyes, peeking through finger gaps
 * - peeking: password revealed → hands drop a little, eyes wide
 * - shakeSignal: bump this number to play a "no" head-shake (e.g. wrong credentials)
 *
 * Perf: cursor-follow writes pupil `transform` directly via refs on a rAF loop
 * (no React re-render per mouse-move); the shake plays via the Web Animations API.
 * Both are transform-only, so this stays GPU-cheap.
 */
export function AuthMascot({
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
  const leftPupilRef = useRef<SVGGElement>(null);
  const rightPupilRef = useRef<SVGGElement>(null);
  const coveringRef = useRef(covering);

  useEffect(() => {
    coveringRef.current = covering;
  }, [covering]);

  // ---- Eyes follow the cursor (direct DOM writes — no React state in the hot path) ----
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let center = { x: 0, y: 0, scale: 1 };
    let dirty = true;
    const mouse = { x: -9999, y: -9999 };
    const cur = { lx: 0, ly: 0, rx: 0, ry: 0 };
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
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onDirty = () => {
      dirty = true;
    };

    const tick = () => {
      if (dirty) measure();
      if (!coveringRef.current && center.scale > 0) {
        const dx = (mouse.x - center.x) / center.scale;
        const dy = (mouse.y - center.y) / center.scale;
        const dist = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(MAX_PUPIL_OFFSET, dist * 0.06);
        const tx = (dx / dist) * clamped;
        const ty = (dy / dist) * clamped;
        cur.lx += (tx - cur.lx) * LERP;
        cur.ly += (ty - cur.ly) * LERP;
        cur.rx += (tx - cur.rx) * LERP;
        cur.ry += (ty - cur.ry) * LERP;
        leftPupilRef.current?.style.setProperty(
          "transform",
          `translate(${cur.lx}px, ${cur.ly}px)`,
        );
        rightPupilRef.current?.style.setProperty(
          "transform",
          `translate(${cur.rx}px, ${cur.ry}px)`,
        );
      }
      raf = requestAnimationFrame(tick);
    };

    measure();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onDirty);
    window.addEventListener("scroll", onDirty, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onDirty);
      window.removeEventListener("scroll", onDirty);
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

  const handTransition = "transform .45s cubic-bezier(0.16, 1, 0.3, 1)";
  const leftHand = covering
    ? peeking
      ? "translateY(30px) rotate(-5deg)"
      : "translateY(0) rotate(0deg)"
    : "translateY(66px) rotate(-9deg)";
  const rightHand = covering
    ? peeking
      ? "translateY(30px) rotate(5deg)"
      : "translateY(0) rotate(0deg)"
    : "translateY(66px) rotate(9deg)";

  // pupils peek upward while covering; wide otherwise
  const pupilDy = covering && !peeking ? -2.5 : 2;
  const pupilR = peeking ? 7 : 6;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 240 220"
      className={cn("block overflow-visible", className)}
      role="img"
      aria-label="Nebula maskotu"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="m-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffb68f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffb68f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="m-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9d6b6" />
          <stop offset="100%" stopColor="#eeb98f" />
        </linearGradient>
        <linearGradient id="m-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaf0fb" />
          <stop offset="100%" stopColor="#c3cfe4" />
        </linearGradient>
        <linearGradient id="m-glove" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6f9" />
          <stop offset="100%" stopColor="#d5dbe4" />
        </linearGradient>
        <linearGradient id="m-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8f45" />
          <stop offset="100%" stopColor="#d34f10" />
        </linearGradient>
        <linearGradient id="m-suit-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8681c" />
          <stop offset="100%" stopColor="#b03c0a" />
        </linearGradient>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="120" cy="104" rx="104" ry="100" fill="url(#m-glow)" />

      {/* Suit shoulders (torso — does not shake with the head) */}
      <path d="M56 220 C56 176 84 158 120 158 C156 158 184 176 184 220 Z" fill="url(#m-suit)" />
      <path d="M56 220 C56 176 84 158 120 158 L120 220 Z" fill="url(#m-suit-shade)" opacity="0.3" />

      {/* Neck ring — metal disconnect collar where a helmet would seal on */}
      <path d="M120 158 C104 158 92 168 90 182 L150 182 C148 168 136 158 120 158 Z" fill="#c7ccd3" />
      <path d="M93 179 L147 179" stroke="#9aa0aa" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

      {/* Center zipper */}
      <line x1="120" y1="183" x2="120" y2="220" stroke="#96330a" strokeWidth="3" strokeLinecap="round" opacity="0.55" />

      {/* Shoulder patches */}
      <rect x="66" y="188" width="16" height="11" rx="2.5" fill="#f4f6f9" opacity="0.85" />
      <rect x="158" y="188" width="16" height="11" rx="2.5" fill="#f4f6f9" opacity="0.85" />

      {/* Chest name patch + comm badge */}
      <rect x="86" y="196" width="22" height="9" rx="2.5" fill="#f4f6f9" opacity="0.85" />
      <rect x="134" y="188" width="22" height="24" rx="5" fill="#00000018" />
      <circle cx="145" cy="199" r="8" fill="#0e1011" />
      <circle cx="145" cy="199" r="3.5" fill="#8fe3b0" />

      {/* Head group — antenna, hair, face. Pivots near the neck for the shake gesture. */}
      <g ref={headRef} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        {/* Antenna */}
        <line x1="120" y1="44" x2="120" y2="26" stroke="#b7c7eb" strokeWidth="4" strokeLinecap="round" />
        <circle cx="120" cy="22" r="6" fill="#ffb68f" className="animate-pulse-glow" />

        {/* Back hair tufts */}
        <path d="M70 78 C55 60 62 44 78 46 C70 58 74 70 82 76 Z" fill="url(#m-hair)" />
        <path d="M170 78 C185 60 178 44 162 46 C170 58 166 70 158 76 Z" fill="url(#m-hair)" />

        {/* Head */}
        <circle cx="120" cy="100" r="60" fill="url(#m-skin)" />
        <ellipse cx="120" cy="118" rx="46" ry="40" fill="#f6cca6" opacity="0.5" />

        {/* Ears */}
        <circle cx="62" cy="104" r="10" fill="url(#m-skin)" />
        <circle cx="178" cy="104" r="10" fill="url(#m-skin)" />

        {/* Cheeks */}
        <circle cx="92" cy="118" r="9" fill="#ff9d7a" opacity="0.35" />
        <circle cx="148" cy="118" r="9" fill="#ff9d7a" opacity="0.35" />

        {/* Brows */}
        <path d="M84 80 q16 -9 32 -2" stroke="#b9895f" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M124 78 q16 -7 32 2" stroke="#b9895f" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Eyes — sclera fixed, pupil+highlight groups get the cursor-follow transform */}
        <ellipse cx="100" cy="98" rx="14" ry="15" fill="#ffffff" />
        <ellipse cx="140" cy="98" rx="14" ry="15" fill="#ffffff" />
        <g ref={leftPupilRef}>
          <circle cx="100" cy={98 + pupilDy} r={pupilR} fill="#26314a" />
          <circle cx="102.5" cy={95.5 + pupilDy} r="2" fill="#ffffff" />
        </g>
        <g ref={rightPupilRef}>
          <circle cx="140" cy={98 + pupilDy} r={pupilR} fill="#26314a" />
          <circle cx="142.5" cy={95.5 + pupilDy} r="2" fill="#ffffff" />
        </g>

        {/* Nose + mouth */}
        <ellipse cx="120" cy="120" rx="4" ry="3" fill="#e0a578" />
        {covering ? (
          <ellipse cx="120" cy="136" rx="7" ry="9" fill="#7a3b2a" />
        ) : (
          <path d="M106 132 q14 14 28 0" stroke="#7a3b2a" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}

        {/* Front hair tufts (wild, over the crown) */}
        <path d="M74 60 C70 40 88 34 96 50 C104 34 122 34 128 50 C136 34 156 40 150 60 C150 60 120 48 74 60 Z" fill="url(#m-hair)" />
        <path d="M150 58 C168 46 176 54 172 66 C164 62 156 60 150 58 Z" fill="url(#m-hair)" />
        <path d="M90 56 C74 46 66 54 70 66 C78 60 84 58 90 56 Z" fill="url(#m-hair)" />
      </g>

      {/* LEFT hand (covers left eye) — separate limb, doesn't shake with the head */}
      <g
        style={{
          transform: leftHand,
          transformBox: "fill-box",
          transformOrigin: "center bottom",
          transition: handTransition,
        }}
      >
        <rect x="82" y="72" width="34" height="58" rx="17" fill="url(#m-glove)" />
        <rect x="73" y="104" width="12" height="23" rx="6" fill="url(#m-glove)" transform="rotate(-32 79 115.5)" />
        <ellipse cx="91" cy="83" rx="8" ry="10" fill="#ffffff" opacity="0.25" />
        <path
          d="M91 80 L91 116 M99 78 L99 118 M107 80 L107 116"
          stroke="#b7bcc4"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
        <rect x="80" y="123" width="38" height="11" rx="5.5" fill="#ffb68f" />
        <rect x="80" y="123" width="38" height="4" rx="2" fill="#ffffff" opacity="0.35" />
      </g>

      {/* RIGHT hand (covers right eye) */}
      <g
        style={{
          transform: rightHand,
          transformBox: "fill-box",
          transformOrigin: "center bottom",
          transition: handTransition,
        }}
      >
        <rect x="124" y="72" width="34" height="58" rx="17" fill="url(#m-glove)" />
        <rect x="155" y="104" width="12" height="23" rx="6" fill="url(#m-glove)" transform="rotate(32 161 115.5)" />
        <ellipse cx="149" cy="83" rx="8" ry="10" fill="#ffffff" opacity="0.25" />
        <path
          d="M133 80 L133 116 M141 78 L141 118 M149 80 L149 116"
          stroke="#b7bcc4"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
        <rect x="122" y="123" width="38" height="11" rx="5.5" fill="#ffb68f" />
        <rect x="122" y="123" width="38" height="4" rx="2" fill="#ffffff" opacity="0.35" />
      </g>
    </svg>
  );
}
