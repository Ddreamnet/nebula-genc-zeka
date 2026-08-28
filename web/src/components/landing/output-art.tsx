/**
 * The six things a student actually walks out with, drawn.
 *
 * These replace the grey box-and-line wireframes the cards used to show. A
 * wireframe of a website is not a website — it reads as "art pending", which
 * is the opposite of the section's whole claim ("ders bitince elinde gerçek
 * bir şey kalıyor").
 *
 * Same cut-paper rules as <Nova>: one navy outline weight, flat fills, no
 * gradients. Every scene shares the 320x190 viewBox and scales to fit, so a
 * narrow bento cell and the wide one can show the same art at different sizes
 * without separate versions.
 */

const INK = "#152343";
const PAPER = "#FFFBF2";
const PAPER_DIM = "#E7DCC6";
const SCREEN = "#101B38";
const BLUE = "#3D5FE0";
const AMBER = "#FF9F45";
const MINT = "#2FD08A";
const CORAL = "#FF6B8A";
const VIOLET = "#8B6BFF";

/**
 * Absolutely positioned on purpose. In normal flow inside an auto-height
 * parent, `height: 100%` resolves to `auto` and the SVG grows to its full
 * intrinsic height from whatever width it's given — which is what made these
 * cards several hundred pixels tall. Pinning all four edges gives it a
 * definite box to letterbox inside instead. The card's panel supplies the
 * `position: relative`.
 */
function Scene({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 190"
      preserveAspectRatio="xMidYMid meet"
      // Width/height are explicit, not left to the four insets: an SVG is a
      // replaced element, and an absolutely positioned replaced element with
      // `width: auto` takes its intrinsic size rather than stretching between
      // its offsets — which let the art overflow the panel onto the text.
      style={{
        position: "absolute",
        top: 14,
        left: 16,
        width: "calc(100% - 32px)",
        height: "calc(100% - 28px)",
      }}
      fill="none"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** ÇIKTI 01 — a real browser window with a real page inside it. */
export function WebArt() {
  return (
    <Scene>
      <rect x={44} y={24} width={232} height={144} rx={15} fill={PAPER} stroke={INK} strokeWidth={5} />
      <path d="M44 56h232" stroke={INK} strokeWidth={5} />
      <circle cx={61} cy={40} r={4.5} fill={CORAL} />
      <circle cx={77} cy={40} r={4.5} fill={AMBER} />
      <circle cx={93} cy={40} r={4.5} fill={MINT} />
      <rect x={112} y={35} width={112} height={11} rx={5.5} fill={PAPER_DIM} />

      <rect x={62} y={70} width={86} height={15} rx={7.5} fill={BLUE} />
      <rect x={62} y={94} width={132} height={8} rx={4} fill={PAPER_DIM} />
      <rect x={62} y={108} width={104} height={8} rx={4} fill={PAPER_DIM} />
      <rect x={62} y={128} width={60} height={24} rx={12} fill={AMBER} stroke={INK} strokeWidth={4} />
      <rect x={130} y={128} width={60} height={24} rx={12} fill={PAPER} stroke={INK} strokeWidth={4} />
      <rect x={210} y={70} width={52} height={52} rx={12} fill={VIOLET} stroke={INK} strokeWidth={4} />
      <circle cx={224} cy={84} r={5} fill={PAPER} opacity={0.7} />
      <path d="M214 114l12-14 10 11 8-8 14 15z" fill={PAPER} opacity={0.55} />

      {/* Cursor, mid-click on the primary button. */}
      <path
        d="M170 146v28l7.5-7.5 5.5 12 7-3.2-5.6-11.8H196z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </Scene>
  );
}

/** ÇIKTI 02 — a character on screen, mid-sentence. */
export function AvatarArt() {
  return (
    <Scene>
      <rect x={62} y={18} width={196} height={132} rx={18} fill={SCREEN} stroke={INK} strokeWidth={5} />

      {/* Bust, built bottom-up so each layer's outline is covered by the next. */}
      <path
        d="M128 150c0-20 14-32 32-32s32 12 32 32z"
        fill={MINT}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <rect x={134} y={48} width={52} height={58} rx={21} fill="#FFD9A8" stroke={INK} strokeWidth={4} />
      <path
        d="M132 74v-8a28 26 0 0 1 56 0v8c-5-13-15-19-28-19s-23 6-28 19z"
        fill={VIOLET}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <circle cx={150} cy={78} r={4.2} fill={INK} />
      <circle cx={170} cy={78} r={4.2} fill={INK} />
      <path d="M151 91q9 8 18 0" stroke={INK} strokeWidth={4} strokeLinecap="round" />

      {/* Voice — the bars are what say "it talks". */}
      {[
        [86, 20],
        [99, 38],
        [112, 28],
        [208, 28],
        [221, 38],
        [234, 20],
      ].map(([x, h], i) => (
        <rect key={x} x={x} y={88 - h / 2} width={9} height={h} rx={4.5} fill={i % 2 ? AMBER : "#7C89AE"} />
      ))}

      <rect x={112} y={162} width={96} height={16} rx={8} fill={AMBER} stroke={INK} strokeWidth={4} />
    </Scene>
  );
}

/** ÇIKTI 03 — a platformer mid-jump, with a score. */
export function OyunArt() {
  return (
    <Scene>
      <rect x={50} y={20} width={220} height={150} rx={17} fill={SCREEN} stroke={INK} strokeWidth={5} />
      <rect x={66} y={38} width={46} height={13} rx={6.5} fill={MINT} stroke={INK} strokeWidth={3.5} />
      <rect x={122} y={40} width={9} height={9} rx={2} fill={AMBER} />
      <rect x={136} y={40} width={9} height={9} rx={2} fill={AMBER} />
      <rect x={150} y={40} width={9} height={9} rx={2} fill="#39456B" />

      <rect x={68} y={128} width={66} height={13} rx={6.5} fill={BLUE} stroke={INK} strokeWidth={3.5} />
      <rect x={158} y={104} width={66} height={13} rx={6.5} fill={BLUE} stroke={INK} strokeWidth={3.5} />
      <rect x={112} y={72} width={50} height={13} rx={6.5} fill={BLUE} stroke={INK} strokeWidth={3.5} />

      <rect x={86} y={94} width={30} height={30} rx={10} fill={CORAL} stroke={INK} strokeWidth={4} />
      <circle cx={95} cy={106} r={3.2} fill={INK} />
      <circle cx={107} cy={106} r={3.2} fill={INK} />
      <path d="M96 116q5 5 10 0" stroke={INK} strokeWidth={3} strokeLinecap="round" />

      <circle cx={191} cy={80} r={12} fill={AMBER} stroke={INK} strokeWidth={4} />
      <circle cx={191} cy={80} r={4} fill={INK} opacity={0.25} />
      <path
        d="M137 52l3.4 9.2 9.2 3.4-9.2 3.4-3.4 9.2-3.4-9.2-9.2-3.4 9.2-3.4z"
        fill="#FFD27A"
        stroke={INK}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </Scene>
  );
}

/** ÇIKTI 04 — a finished poster, tilted like it's pinned to a wall. */
export function AfisArt() {
  return (
    <Scene>
      <circle cx={64} cy={50} r={17} fill={CORAL} stroke={INK} strokeWidth={4} />
      <circle cx={258} cy={132} r={14} fill={MINT} stroke={INK} strokeWidth={4} />
      <circle cx={252} cy={44} r={9} fill={BLUE} stroke={INK} strokeWidth={3.5} />

      <g transform="rotate(-5 160 95)">
        <rect x={102} y={22} width={116} height={146} rx={11} fill={PAPER} stroke={INK} strokeWidth={5} />
        <circle cx={160} cy={70} r={29} fill={AMBER} />
        <path d="M112 130l26-32 20 24 16-18 26 30z" fill={VIOLET} />
        <path d="M112 130h88" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <rect x={114} y={140} width={62} height={9} rx={4.5} fill={INK} opacity={0.75} />
        <rect x={114} y={154} width={38} height={7} rx={3.5} fill={INK} opacity={0.35} />
      </g>
    </Scene>
  );
}

/** ÇIKTI 05 — a track being played, not a generic waveform. */
export function MuzikArt() {
  const bars = [26, 52, 38, 78, 60, 92, 44, 68, 34, 56, 24];
  return (
    <Scene>
      <rect x={40} y={26} width={240} height={138} rx={17} fill={SCREEN} stroke={INK} strokeWidth={5} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={60 + i * 19}
          y={112 - h / 2}
          width={11}
          height={h}
          rx={5.5}
          fill={i % 3 === 0 ? AMBER : i % 3 === 1 ? VIOLET : MINT}
        />
      ))}
      <rect x={60} y={134} width={200} height={7} rx={3.5} fill="#39456B" />
      <rect x={60} y={134} width={118} height={7} rx={3.5} fill={AMBER} />
      <circle cx={178} cy={137.5} r={9} fill={PAPER} stroke={INK} strokeWidth={4} />

      <path
        d="M196 44v34a12 10 0 1 1-8-9.4V52l30-7v30a12 10 0 1 1-8-9.4V38z"
        fill={AMBER}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </Scene>
  );
}

/** ÇIKTI 06 — a clapperboard and the finished cut beside it. */
export function VideoArt() {
  return (
    <Scene>
      <rect x={30} y={52} width={148} height={108} rx={14} fill={SCREEN} stroke={INK} strokeWidth={5} />
      <path
        d="M30 52l6-24 146 14-6 24z"
        fill={PAPER}
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${52 + i * 34} ${30 + i * 1.6}l-9 26 14 1.4 9-26z`}
          fill={INK}
          opacity={0.85}
        />
      ))}
      <rect x={48} y={78} width={82} height={9} rx={4.5} fill="#39456B" />
      <rect x={48} y={96} width={58} height={9} rx={4.5} fill="#39456B" />
      <rect x={48} y={128} width={46} height={18} rx={9} fill={CORAL} stroke={INK} strokeWidth={4} />

      <circle cx={240} cy={104} r={34} fill={AMBER} stroke={INK} strokeWidth={5} />
      <path d="M231 90l22 14-22 14z" fill={INK} strokeLinejoin="round" />
      <path
        d="M282 40l3.6 9.8 9.8 3.6-9.8 3.6-3.6 9.8-3.6-9.8-9.8-3.6 9.8-3.6z"
        fill={MINT}
        stroke={INK}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
    </Scene>
  );
}

/**
 * Art keyed by output slug. The bento card and the category page it opens draw
 * from this one map, so a card and its page can never end up showing different
 * pictures for the same output.
 */
export const OUTPUT_ART: Record<string, () => React.ReactElement> = {
  "web-sitesi": WebArt,
  avatar: AvatarArt,
  oyun: OyunArt,
  afis: AfisArt,
  muzik: MuzikArt,
  video: VideoArt,
};
