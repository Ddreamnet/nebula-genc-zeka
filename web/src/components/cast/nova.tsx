import { cn } from "@/lib/cn";

/**
 * NOVA — Nebula Genç Zeka's mascot.
 *
 * Drawn in code rather than shipped as art on purpose: poses, colors and
 * expressions become props, the file weight is zero, and the idle motion is a
 * compositor-only CSS transform instead of a video loop that would blow the
 * 60fps budget and add megabytes.
 *
 * The character rules (keep these; they're what makes Nova ours and not a
 * stock astronaut):
 *   · The visor is opaque. There is NO face inside — just two amber lights and
 *     one star reflection. Every expression is carried by those two lights, so
 *     Nova reads as friendly without ever looking like a specific person.
 *   · Every shape carries the same navy outline at the same weight, as if cut
 *     from paper and stacked. No gradients, no soft shadows.
 *   · Limbs are drawn as a navy stroke with a cream stroke laid over it, so a
 *     tube gets a perfect outline from two paths instead of an outline shape
 *     that has to be redrawn for every pose.
 */

const INK = "#152343";
const SUIT = "#FFFBF2";
const SUIT_SHADE = "#E7DCC6";
const VISOR = "#101B38";
const AMBER = "#FF9F45";
const MINT = "#2FD08A";

/** Arm/leg geometry per pose. `cuff` is the short segment nearest the hand. */
type Pose = "float" | "wave" | "cheer" | "point" | "think";

type Limb = { d: string; cuff: string; hand: [number, number] };
type Legs = { left: string; leftBoot: string; right: string; rightBoot: string };

const STAND: Legs = {
  left: "M88 174L88 202",
  leftBoot: "M89 206L74 206",
  right: "M112 174L112 202",
  rightBoot: "M111 206L126 206",
};

const TUCK: Legs = {
  left: "M89 175L78 195",
  leftBoot: "M79 197L64 202",
  right: "M111 175L121 196",
  rightBoot: "M121 198L136 203",
};

const POSES: Record<Pose, { left: Limb; right: Limb; legs: Legs }> = {
  float: {
    left: { d: "M74 133L40 151", cuff: "M54 144L43 150", hand: [36, 155] },
    right: { d: "M126 133L160 151", cuff: "M146 144L157 150", hand: [164, 155] },
    legs: TUCK,
  },
  wave: {
    left: { d: "M74 135L57 167", cuff: "M64 154L59 163", hand: [53, 173] },
    right: { d: "M126 129L166 101", cuff: "M157 108L164 103", hand: [174, 96] },
    legs: STAND,
  },
  cheer: {
    left: { d: "M74 131L42 100", cuff: "M52 110L44 102", hand: [33, 93] },
    right: { d: "M126 131L158 100", cuff: "M148 110L156 102", hand: [167, 93] },
    legs: STAND,
  },
  point: {
    left: { d: "M74 135L58 165", cuff: "M65 152L60 161", hand: [54, 171] },
    right: { d: "M126 136L161 130", cuff: "M148 132L159 130", hand: [167, 129] },
    legs: STAND,
  },
  think: {
    left: { d: "M74 136L52 158", cuff: "M60 150L54 156", hand: [46, 164] },
    right: { d: "M126 134L160 112", cuff: "M150 118L158 113", hand: [168, 107] },
    legs: STAND,
  },
};

/** A tube limb: navy outline stroke, cream stroke over it, amber cuff, mitten. */
function Arm({ limb }: { limb: Limb }) {
  return (
    <g>
      <path d={limb.d} stroke={INK} strokeWidth={26} strokeLinecap="round" fill="none" />
      <path d={limb.d} stroke={SUIT} strokeWidth={19} strokeLinecap="round" fill="none" />
      <path d={limb.cuff} stroke={AMBER} strokeWidth={19} strokeLinecap="butt" fill="none" />
      <circle cx={limb.hand[0]} cy={limb.hand[1]} r={13} fill={SUIT} stroke={INK} strokeWidth={7} />
    </g>
  );
}

/** Same two-stroke trick; the boot is simply a thicker segment at the end. */
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

export function Nova({
  pose = "float",
  className,
  style,
  /** Tint of the two visor lights. Swap it to re-key Nova to a section's color. */
  eyeColor = AMBER,
  /** Set false where several Novas share a screen and blinking in unison would
   *  read as a glitch rather than as life. */
  blink = true,
  title = "Nova, Nebula'nın astronotu",
}: {
  pose?: Pose;
  className?: string;
  style?: React.CSSProperties;
  eyeColor?: string;
  blink?: boolean;
  title?: string;
}) {
  const p = POSES[pose];

  return (
    <svg
      viewBox="0 0 200 236"
      className={cn("nb-nova", className)}
      style={style}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Antenna — drawn first so the helmet covers where it enters. Two
          strokes, like the limbs: a bare navy line is invisible against a
          space band, which left the amber tip floating unattached. */}
      <path d="M134 38L164 12" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M134 38L164 12" stroke={SUIT} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={166} cy={11} r={9} fill={AMBER} stroke={INK} strokeWidth={6} />

      {/* Life-support pack, peeking out behind the torso. */}
      <rect x={62} y={112} width={76} height={62} rx={24} fill={SUIT_SHADE} stroke={INK} strokeWidth={7} />

      <Leg d={p.legs.left} boot={p.legs.leftBoot} />
      <Leg d={p.legs.right} boot={p.legs.rightBoot} />

      <Arm limb={p.left} />
      <Arm limb={p.right} />

      {/* Torso */}
      <rect x={66} y={108} width={68} height={78} rx={27} fill={SUIT} stroke={INK} strokeWidth={7} />

      {/* Chest panel — the two status dots are the only "tech" detail on the
          suit, and the mint one is what makes the amber elsewhere read as
          deliberate rather than as the single accent color. */}
      <rect x={83} y={132} width={34} height={26} rx={8} fill={SUIT} stroke={INK} strokeWidth={5} />
      <circle cx={93} cy={141} r={3.6} fill={MINT} />
      <circle cx={93} cy={150} r={3.6} fill={AMBER} />
      <rect x={101} y={139} width={11} height={4} rx={2} fill={INK} opacity={0.35} />
      <rect x={101} y={147} width={8} height={4} rx={2} fill={INK} opacity={0.22} />

      {/* Helmet side pods */}
      <ellipse cx={46} cy={74} rx={11} ry={17} fill={SUIT} stroke={INK} strokeWidth={7} />
      <ellipse cx={154} cy={74} rx={11} ry={17} fill={SUIT} stroke={INK} strokeWidth={7} />

      {/* Helmet + visor */}
      <circle cx={100} cy={72} r={56} fill={SUIT} stroke={INK} strokeWidth={7} />
      <circle cx={100} cy={72} r={43} fill={VISOR} />

      {/* Eyes. The wide, low-opacity plate behind each light fakes a glow with
          a flat shape — a real blur filter would re-rasterize every frame the
          blink runs and is exactly the kind of thing that costs frames. */}
      <g className={blink ? "nb-nova__eyes" : undefined}>
        <rect x={73} y={57} width={25} height={30} rx={12} fill={eyeColor} opacity={0.22} />
        <rect x={102} y={57} width={25} height={30} rx={12} fill={eyeColor} opacity={0.22} />
        <rect x={77} y={61} width={17} height={22} rx={8.5} fill={eyeColor} />
        <rect x={106} y={61} width={17} height={22} rx={8.5} fill={eyeColor} />
      </g>

      {/* Visor star reflection — Nova's signature. */}
      <path
        d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z"
        fill="#FFFFFF"
        opacity={0.95}
      />
    </svg>
  );
}
