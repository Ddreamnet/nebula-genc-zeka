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
 *
 * Four independent axes combine into a pose:
 *   pose    arm and leg geometry
 *   facing  body stays put, the head/visor/chest panel turn to a side
 *   eyes    the shape of the two visor lights — the only source of expression
 *   lean    rotation of the whole figure (flight, fall, tilt)
 *
 * `brand-kit/build.mjs` mirrors this geometry to standalone .svg/.png so the
 * same character can be used in Canva / Claude Design. If anything here moves,
 * rerun `node brand-kit/build.mjs`.
 */

const INK = "#152343";
const SUIT = "#FFFBF2";
const SUIT_SHADE = "#E7DCC6";
const VISOR = "#101B38";
const AMBER = "#FF9F45";
const MINT = "#2FD08A";

type Limb = { d: string; cuff: string; hand: [number, number] };
type Legs = { left: string; leftBoot: string; right: string; rightBoot: string };

/**
 * A straight arm: one segment out of the shoulder. `limb(x, y, angle, length)`
 * splits it into the tube, the amber cuff near the wrist, and the mitten.
 *
 * Angles are SVG degrees: 0° right · 90° DOWN · -90° up · 180° left.
 *
 * Two hard constraints come from the draw order below. An arm is painted
 * before the torso and the helmet, so a hand that lands inside either simply
 * disappears:
 *   · keep the hand out of the torso box (x 62–138, y 108–186)
 *   · a raised hand must clear the helmet — ≥ 64 units from (100, 72) for the
 *     elbow end, ≥ 70 for the mitten. That is why raised arms are long (54+)
 *     and why `point-up` bends around the helmet instead of going straight up.
 * Anything that must cross the visor (a salute) sets `front` instead.
 */
const r1 = (n: number) => Math.round(n * 10) / 10;

function limb(sx: number, sy: number, deg: number, len: number): Limb {
  const a = (deg * Math.PI) / 180;
  const ex = sx + Math.cos(a) * len;
  const ey = sy + Math.sin(a) * len;
  const at = (t: number) => [r1(sx + (ex - sx) * t), r1(sy + (ey - sy) * t)];
  const [c0x, c0y] = at(0.56);
  const [c1x, c1y] = at(0.93);
  return {
    d: `M${sx} ${sy}L${r1(ex)} ${r1(ey)}`,
    cuff: `M${c0x} ${c0y}L${c1x} ${c1y}`,
    hand: [r1(sx + Math.cos(a) * (len + 6)), r1(sy + Math.sin(a) * (len + 6))],
  };
}

/** An arm with an elbow: shoulder → elbow → hand. Same two-stroke trick. */
function bentLimb(sx: number, sy: number, ex: number, ey: number, hx: number, hy: number): Limb {
  const t = (ax: number, ay: number, bx: number, by: number, k: number) =>
    [r1(ax + (bx - ax) * k), r1(ay + (by - ay) * k)];
  const [c0x, c0y] = t(ex, ey, hx, hy, 0.35);
  const [c1x, c1y] = t(ex, ey, hx, hy, 0.86);
  const dx = hx - ex;
  const dy = hy - ey;
  const m = Math.hypot(dx, dy) || 1;
  return {
    d: `M${sx} ${sy}L${ex} ${ey}L${hx} ${hy}`,
    cuff: `M${c0x} ${c0y}L${c1x} ${c1y}`,
    hand: [r1(hx + (dx / m) * 6), r1(hy + (dy / m) * 6)],
  };
}

const L = (deg: number, len: number) => limb(74, 134, deg, len);
const R = (deg: number, len: number) => limb(126, 134, deg, len);

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

/** Walking. */
const STRIDE: Legs = {
  left: "M88 174L74 198",
  leftBoot: "M74 202L59 203",
  right: "M112 174L122 200",
  rightBoot: "M122 204L137 202",
};

/** Both knees kicked out — jumping, celebrating. */
const JUMP: Legs = {
  left: "M89 174L70 188L76 204",
  leftBoot: "M77 207L62 209",
  right: "M111 174L130 188L124 204",
  rightBoot: "M123 207L138 209",
};

/** Nearly straight, hanging — calmer than TUCK for a figure just holding air. */
const DANGLE: Legs = {
  left: "M89 176L84 205",
  leftBoot: "M84 208L69 209",
  right: "M111 176L116 205",
  rightBoot: "M116 208L131 209",
};

type PoseSpec = { left: Limb; right: Limb; legs: Legs; front?: "left" | "right" };

/**
 * The first five are the original hand-written coordinates the site shipped
 * with; they stay literal so nothing on the page shifts by a pixel. Everything
 * after them is generated, so a new pose is one line.
 */
const POSES = {
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

  /* --- pointing --- */
  /** Mirror of `point` — "back" in a carousel. */
  "point-left": { left: L(190, 36), right: R(62, 34), legs: STAND },
  /** Points up. The arm bends around the helmet; straight up would vanish behind it. */
  "point-up": { left: L(112, 34), right: bentLimb(126, 134, 172, 124, 180, 56), legs: STAND },
  /** Points down — "scroll", "details below". */
  "point-down": { left: L(112, 34), right: R(38, 44), legs: STAND },
  /** Long horizontal reach: takes in a whole image placed beside it. */
  "point-far": { left: L(112, 34), right: R(-8, 48), legs: STAND },

  /* --- hands --- */
  /** Mirror of `wave`. */
  "wave-left": { left: L(215, 48), right: R(62, 36), legs: STAND },
  /** One arm up. Half a `cheer` — a quieter yes. */
  "raise-right": { left: L(104, 34), right: R(-48, 54), legs: STAND },
  "raise-left": { left: L(228, 54), right: R(76, 34), legs: STAND },
  /** Open palm presenting whatever sits next to it. */
  "present-right": { left: L(114, 33), right: R(14, 46), legs: STAND },
  "present-left": { left: L(166, 46), right: R(66, 33), legs: STAND },
  /** Salute. Drawn in FRONT of the helmet — behind it the hand is invisible. */
  salute: {
    left: L(100, 34),
    right: bentLimb(126, 134, 168, 112, 142, 56),
    front: "right",
    legs: STAND,
  },
  /** Shoulders up, palms out: "I don't know", "you tell me". */
  shrug: { left: L(196, 34), right: R(-16, 34), legs: STAND },
  /** Both hands wide and level — drop a sign or card in the gap between them. */
  hold: { left: L(174, 48), right: R(6, 48), legs: STAND },
  /** Hands on hips. */
  hips: {
    left: bentLimb(74, 134, 42, 152, 56, 176),
    right: bentLimb(126, 134, 158, 152, 144, 176),
    legs: STAND,
  },
  /** Arms wide open — "all of it is here". */
  open: { left: L(158, 44), right: R(22, 44), legs: STAND },

  /* --- motion --- */
  /** Flight. Pair it with `lean={-24}`. */
  fly: { left: L(120, 40), right: R(-16, 48), legs: TUCK },
  jump: { left: L(230, 56), right: R(-50, 56), legs: JUMP },
  walk: { left: L(122, 36), right: R(52, 36), legs: STRIDE },
  /** The calmest stance — for beside a long block of text. */
  hover: { left: L(120, 36), right: R(60, 36), legs: DANGLE },
} satisfies Record<string, PoseSpec>;

type Pose = keyof typeof POSES;

/**
 * Eye shapes. The two lights keep the same centers (85.5 / 114.5, y 72) in
 * every variant — only the shape changes, so no expression ever reads as a
 * different character.
 */
const EYE_CX = [85.5, 114.5];
const EYE_CY = 72;

function RectEyes({ w, h, gw, gh, color }: { w: number; h: number; gw: number; gh: number; color: string }) {
  return (
    <>
      {EYE_CX.map((cx) => (
        <rect
          key={`g${cx}`}
          x={r1(cx - gw / 2)}
          y={r1(EYE_CY - gh / 2)}
          width={gw}
          height={gh}
          rx={r1(Math.min(gw, gh) / 2)}
          fill={color}
          opacity={0.22}
        />
      ))}
      {EYE_CX.map((cx) => (
        <rect
          key={`c${cx}`}
          x={r1(cx - w / 2)}
          y={r1(EYE_CY - h / 2)}
          width={w}
          height={h}
          rx={r1(Math.min(w, h) / 2)}
          fill={color}
        />
      ))}
    </>
  );
}

/** Smiling eyes: an upward arc. Still just the shape of a light — not a mouth. */
function ArcEyes({ color }: { color: string }) {
  const d = (cx: number) => `M${r1(cx - 10)} ${EYE_CY + 6}Q${cx} ${EYE_CY - 12} ${r1(cx + 10)} ${EYE_CY + 6}`;
  return (
    <>
      {EYE_CX.map((cx) => (
        <path key={`g${cx}`} d={d(cx)} stroke={color} strokeWidth={15} strokeLinecap="round" opacity={0.22} fill="none" />
      ))}
      {EYE_CX.map((cx) => (
        <path key={`c${cx}`} d={d(cx)} stroke={color} strokeWidth={7} strokeLinecap="round" fill="none" />
      ))}
    </>
  );
}

const EYES = {
  /** Calm, friendly. The default everywhere. */
  default: (color: string) => (
    <>
      <rect x={73} y={57} width={25} height={30} rx={12} fill={color} opacity={0.22} />
      <rect x={102} y={57} width={25} height={30} rx={12} fill={color} opacity={0.22} />
      <rect x={77} y={61} width={17} height={22} rx={8.5} fill={color} />
      <rect x={106} y={61} width={17} height={22} rx={8.5} fill={color} />
    </>
  ),
  /** Surprised, excited. */
  wide: (color: string) => <RectEyes w={21} h={27} gw={29} gh={35} color={color} />,
  /** Narrow — concentrating, or a warning. */
  focus: (color: string) => <RectEyes w={11} h={24} gw={19} gh={32} color={color} />,
  /** Shut — asleep, or a held beat. */
  closed: (color: string) => <RectEyes w={19} h={5.5} gw={27} gh={11} color={color} />,
  /** Smiling. */
  happy: (color: string) => <ArcEyes color={color} />,
};

type EyeShape = keyof typeof EYES;

/**
 * Turning the head. The body holds still; the visor, lights, signature star
 * and chest panel slide to one side, the far helmet pod shrinks and the near
 * one pushes out. In a flat cut-paper style that is the whole trick for a
 * three-quarter turn — nothing has to be redrawn.
 */
const FACINGS = {
  front: { visor: 0, eyes: 0, star: 0, panel: 0, near: 154, far: 46, nearR: 11, farR: 11, nearRy: 17, farRy: 17 },
  right: { visor: 6, eyes: 10, star: 6, panel: 5, near: 157, far: 50, nearR: 12, farR: 8, nearRy: 18, farRy: 14 },
  left: { visor: -6, eyes: -10, star: -6, panel: -5, near: 43, far: 150, nearR: 12, farR: 8, nearRy: 18, farRy: 14 },
};

type Facing = keyof typeof FACINGS;

/** A tube limb: navy outline stroke, cream stroke over it, amber cuff, mitten. */
function Arm({ limb }: { limb: Limb }) {
  return (
    <g>
      <path d={limb.d} stroke={INK} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={limb.d} stroke={SUIT} strokeWidth={19} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={limb.cuff} stroke={AMBER} strokeWidth={19} strokeLinecap="butt" fill="none" />
      <circle cx={limb.hand[0]} cy={limb.hand[1]} r={13} fill={SUIT} stroke={INK} strokeWidth={7} />
    </g>
  );
}

/** Same two-stroke trick; the boot is simply a thicker segment at the end. */
function Leg({ d, boot }: { d: string; boot: string }) {
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={25} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={d} stroke={SUIT} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
  /** Shape of those lights — Nova's only expression channel. */
  eyes = "default",
  /** Turn the head without moving the body. */
  facing = "front",
  /** Tilt the whole figure, in degrees. Pair with `pose="fly"`. */
  lean = 0,
  /** Set false where several Novas share a screen and blinking in unison would
   *  read as a glitch rather than as life. */
  blink = true,
  title = "Nova, Nebula'nın astronotu",
}: {
  pose?: Pose;
  className?: string;
  style?: React.CSSProperties;
  eyeColor?: string;
  eyes?: EyeShape;
  facing?: Facing;
  lean?: number;
  blink?: boolean;
  title?: string;
}) {
  const p: PoseSpec = POSES[pose];
  const f = FACINGS[facing];
  const nearIsRight = facing !== "left";
  const podL = nearIsRight ? { cx: f.far, rx: f.farR, ry: f.farRy } : { cx: f.near, rx: f.nearR, ry: f.nearRy };
  const podR = nearIsRight ? { cx: f.near, rx: f.nearR, ry: f.nearRy } : { cx: f.far, rx: f.farR, ry: f.farRy };
  const frontArm = p.front ? (p.front === "left" ? p.left : p.right) : null;

  return (
    <svg
      // A leaned figure needs the extra room: its antenna and reaching hand
      // swing outside the upright box.
      viewBox={lean ? "-26 -18 252 272" : "0 0 200 236"}
      className={cn("nb-nova", className)}
      style={style}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={lean ? `rotate(${lean} 100 118)` : undefined}>
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

        {p.front !== "left" && <Arm limb={p.left} />}
        {p.front !== "right" && <Arm limb={p.right} />}

        {/* Torso */}
        <rect x={66} y={108} width={68} height={78} rx={27} fill={SUIT} stroke={INK} strokeWidth={7} />

        {/* Chest panel — the two status dots are the only "tech" detail on the
            suit, and the mint one is what makes the amber elsewhere read as
            deliberate rather than as the single accent color. */}
        <g transform={`translate(${f.panel} 0)`}>
          <rect x={83} y={132} width={34} height={26} rx={8} fill={SUIT} stroke={INK} strokeWidth={5} />
          <circle cx={93} cy={141} r={3.6} fill={MINT} />
          <circle cx={93} cy={150} r={3.6} fill={AMBER} />
          <rect x={101} y={139} width={11} height={4} rx={2} fill={INK} opacity={0.35} />
          <rect x={101} y={147} width={8} height={4} rx={2} fill={INK} opacity={0.22} />
        </g>

        {/* Helmet side pods */}
        <ellipse cx={podL.cx} cy={74} rx={podL.rx} ry={podL.ry} fill={SUIT} stroke={INK} strokeWidth={7} />
        <ellipse cx={podR.cx} cy={74} rx={podR.rx} ry={podR.ry} fill={SUIT} stroke={INK} strokeWidth={7} />

        {/* Helmet + visor */}
        <circle cx={100} cy={72} r={56} fill={SUIT} stroke={INK} strokeWidth={7} />
        <circle cx={100 + f.visor} cy={72} r={43} fill={VISOR} />

        {/* Eyes. The wide, low-opacity plate behind each light fakes a glow with
            a flat shape — a real blur filter would re-rasterize every frame the
            blink runs and is exactly the kind of thing that costs frames. */}
        <g className={blink ? "nb-nova__eyes" : undefined} transform={`translate(${f.eyes} 0)`}>
          {EYES[eyes](eyeColor)}
        </g>

        {/* Visor star reflection — Nova's signature. Always top-right. */}
        <path
          d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z"
          fill="#FFFFFF"
          opacity={0.95}
          transform={`translate(${f.star} 0)`}
        />

        {/* An arm that has to cross the visor is painted last. */}
        {frontArm && <Arm limb={frontArm} />}
      </g>
    </svg>
  );
}
