import { cn } from "@/lib/cn";

/**
 * Original stylized Nebula astronaut — geometric, lightweight (no raster).
 * Reused across hero / empty states. Animate with `.animate-float` via className.
 */
export function Astronaut({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 260"
      className={cn("block", className)}
      role="img"
      aria-label="Nebula astronotu"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="neb-visor" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#42527040" />
          <stop offset="40%" stopColor="#141a24" />
          <stop offset="100%" stopColor="#090c11" />
        </radialGradient>
        <linearGradient id="neb-suit" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#f4f5f6" />
          <stop offset="100%" stopColor="#c7cad1" />
        </linearGradient>
        <linearGradient id="neb-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffccb2" />
          <stop offset="100%" stopColor="#ff9d6b" />
        </linearGradient>
      </defs>

      {/* Backpack */}
      <rect x="70" y="72" width="80" height="92" rx="26" fill="#aeb2ba" />

      {/* Arms + gloves */}
      <rect x="36" y="98" width="32" height="78" rx="16" fill="url(#neb-suit)" />
      <rect x="152" y="98" width="32" height="78" rx="16" fill="url(#neb-suit)" />
      <rect x="32" y="150" width="40" height="28" rx="14" fill="url(#neb-amber)" />
      <rect x="148" y="150" width="40" height="28" rx="14" fill="url(#neb-amber)" />

      {/* Legs + boots */}
      <rect x="82" y="176" width="26" height="64" rx="13" fill="url(#neb-suit)" />
      <rect x="112" y="176" width="26" height="64" rx="13" fill="url(#neb-suit)" />
      <rect x="76" y="224" width="34" height="22" rx="11" fill="url(#neb-amber)" />
      <rect x="110" y="224" width="34" height="22" rx="11" fill="url(#neb-amber)" />

      {/* Body */}
      <rect x="64" y="94" width="92" height="94" rx="34" fill="url(#neb-suit)" />

      {/* Chest control panel */}
      <rect x="90" y="122" width="40" height="30" rx="9" fill="#20242b" />
      <rect x="96" y="129" width="28" height="3" rx="1.5" fill="#464b53" />
      <circle cx="101" cy="142" r="4" fill="#8fe3b0" />
      <circle cx="115" cy="142" r="4" fill="#ffb68f" />

      {/* Helmet */}
      <circle cx="110" cy="66" r="54" fill="url(#neb-suit)" />
      <circle cx="110" cy="66" r="42" fill="url(#neb-visor)" />

      {/* Visor reflection + tiny star */}
      <ellipse cx="94" cy="50" rx="15" ry="10" fill="#ffffff" opacity="0.16" />
      <path
        d="M131 50 l2.6 7.4 7.4 2.6 -7.4 2.6 -2.6 7.4 -2.6 -7.4 -7.4 -2.6 7.4 -2.6 z"
        fill="#ffc9ae"
        opacity="0.9"
      />

      {/* Antenna */}
      <rect x="107" y="8" width="6" height="14" rx="3" fill="#aeb2ba" />
      <circle cx="110" cy="8" r="5" fill="#ffb68f" />
    </svg>
  );
}
