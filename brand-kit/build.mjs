/**
 * Nebula Genç Zeka — kaset (cast) dışa aktarıcı.
 *
 * Nova ve sahne parçaları sitede React bileşeni olarak yaşıyor
 * (web/src/components/cast/). Bu script aynı geometriyi bağımsız .svg ve .png
 * dosyalarına çıkarır, böylece Instagram / Canva / Claude Design gibi kodun
 * olmadığı yerlerde de aynı karakter kullanılabilir.
 *
 * Çalıştır:  node brand-kit/build.mjs
 *
 * Kaynak bileşenler değişirse burayı da güncelle — tek doğruluk kaynağı
 * hâlâ nova.tsx ve props.tsx.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "../web/node_modules/sharp/lib/index.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(ROOT, "svg");
const PNG_DIR = join(ROOT, "png");

/* ---------------------------------------------------------------- palette */
const INK = "#152343";
const SUIT = "#FFFBF2";
const SUIT_SHADE = "#E7DCC6";
const VISOR = "#101B38";
const AMBER = "#FF9F45";
const MINT = "#2FD08A";

/* ------------------------------------------------------------ Nova poses */
const STAND = {
  left: "M88 174L88 202",
  leftBoot: "M89 206L74 206",
  right: "M112 174L112 202",
  rightBoot: "M111 206L126 206",
};

const TUCK = {
  left: "M89 175L78 195",
  leftBoot: "M79 197L64 202",
  right: "M111 175L121 196",
  rightBoot: "M121 198L136 203",
};

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
};

const arm = (l) => `
  <path d="${l.d}" stroke="${INK}" stroke-width="26" stroke-linecap="round" fill="none"/>
  <path d="${l.d}" stroke="${SUIT}" stroke-width="19" stroke-linecap="round" fill="none"/>
  <path d="${l.cuff}" stroke="${AMBER}" stroke-width="19" stroke-linecap="butt" fill="none"/>
  <circle cx="${l.hand[0]}" cy="${l.hand[1]}" r="13" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>`;

const leg = (d, boot) => `
  <path d="${d}" stroke="${INK}" stroke-width="25" stroke-linecap="round" fill="none"/>
  <path d="${d}" stroke="${SUIT}" stroke-width="18" stroke-linecap="round" fill="none"/>
  <path d="${boot}" stroke="${INK}" stroke-width="29" stroke-linecap="round" fill="none"/>
  <path d="${boot}" stroke="${AMBER}" stroke-width="22" stroke-linecap="round" fill="none"/>`;

function nova(poseName, { eyeColor = AMBER } = {}) {
  const p = POSES[poseName];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 236" fill="none" role="img" aria-label="Nova, Nebula'nın astronotu">
  <title>Nova — ${poseName}</title>

  <!-- anten -->
  <path d="M134 38L164 12" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
  <path d="M134 38L164 12" stroke="${SUIT}" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="166" cy="11" r="9" fill="${AMBER}" stroke="${INK}" stroke-width="6"/>

  <!-- yaşam destek sırt ünitesi -->
  <rect x="62" y="112" width="76" height="62" rx="24" fill="${SUIT_SHADE}" stroke="${INK}" stroke-width="7"/>
${leg(p.legs.left, p.legs.leftBoot)}
${leg(p.legs.right, p.legs.rightBoot)}
${arm(p.left)}
${arm(p.right)}

  <!-- gövde -->
  <rect x="66" y="108" width="68" height="78" rx="27" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>

  <!-- göğüs paneli -->
  <rect x="83" y="132" width="34" height="26" rx="8" fill="${SUIT}" stroke="${INK}" stroke-width="5"/>
  <circle cx="93" cy="141" r="3.6" fill="${MINT}"/>
  <circle cx="93" cy="150" r="3.6" fill="${AMBER}"/>
  <rect x="101" y="139" width="11" height="4" rx="2" fill="${INK}" opacity="0.35"/>
  <rect x="101" y="147" width="8" height="4" rx="2" fill="${INK}" opacity="0.22"/>

  <!-- kask yan podları -->
  <ellipse cx="46" cy="74" rx="11" ry="17" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>
  <ellipse cx="154" cy="74" rx="11" ry="17" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>

  <!-- kask + vizör -->
  <circle cx="100" cy="72" r="56" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>
  <circle cx="100" cy="72" r="43" fill="${VISOR}"/>

  <!-- gözler (yüz yok, sadece iki ışık) -->
  <g>
    <rect x="73" y="57" width="25" height="30" rx="12" fill="${eyeColor}" opacity="0.22"/>
    <rect x="102" y="57" width="25" height="30" rx="12" fill="${eyeColor}" opacity="0.22"/>
    <rect x="77" y="61" width="17" height="22" rx="8.5" fill="${eyeColor}"/>
    <rect x="106" y="61" width="17" height="22" rx="8.5" fill="${eyeColor}"/>
  </g>

  <!-- vizördeki yıldız yansıması: Nova'nın imzası -->
  <path d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z" fill="#FFFFFF" opacity="0.95"/>
</svg>
`;
}

/* ------------------------------------------------------------ sahne props */
const star = (color = AMBER, outlined = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><title>Yıldız</title>
  <path d="M24 2l5.6 15.2L44.8 24l-15.2 6.8L24 46l-5.6-15.2L3.2 24l15.2-6.8z" fill="${color}"${
    outlined ? ` stroke="${INK}" stroke-width="3.5"` : ""
  } stroke-linejoin="round"/>
</svg>
`;

const planet = (color = "#8B6BFF") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 76" fill="none"><title>Gezegen</title>
  <path d="M12 46a40 13 -18 0 0 72-22" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
  <circle cx="48" cy="38" r="26" fill="${color}" stroke="${INK}" stroke-width="4.5"/>
  <circle cx="39" cy="30" r="6" fill="#FFFFFF" opacity="0.28"/>
  <circle cx="57" cy="45" r="4" fill="#FFFFFF" opacity="0.2"/>
  <path d="M84 24a40 13 -18 0 1 -72 22" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
  <path d="M84 24a40 13 -18 0 1 -72 22" stroke="#FFD27A" stroke-width="4" stroke-linecap="round"/>
</svg>
`;

const comet = (color = MINT) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72" fill="none"><title>Kuyruklu yıldız</title>
  <path d="M62 16 6 66l30-8 4 12 12-14 14 6z" fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" opacity="0.9"/>
  <circle cx="68" cy="22" r="17" fill="${color}" stroke="${INK}" stroke-width="5"/>
  <circle cx="62" cy="16" r="5" fill="#FFFFFF" opacity="0.45"/>
</svg>
`;

const rocket = (body = SUIT, fin = "#FF6B8A", win = "#3D5FE0") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 112" fill="none"><title>Roket</title>
  <path d="M18 56 4 84l18-6z" fill="${fin}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M54 56 68 84l-18-6z" fill="${fin}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M36 4c14 14 20 34 18 56v18H18V60C16 38 22 18 36 4z" fill="${body}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="36" cy="42" r="11" fill="${win}" stroke="${INK}" stroke-width="4.5"/>
  <circle cx="32" cy="38" r="3.4" fill="#FFFFFF" opacity="0.6"/>
  <path d="M22 82h28" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M26 86q10 22 20 0z" fill="${AMBER}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M31 88q5 11 10 0z" fill="#FFD27A"/>
</svg>
`;

const bit = (color = "#3D5FE0", eyeColor = "#9BE7FF") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 104" fill="none"><title>Bit — Nova'nın yardımcısı</title>
  <path d="M48 20L48 8" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="48" cy="7" r="7" fill="${AMBER}" stroke="${INK}" stroke-width="4.5"/>
  <rect x="4" y="44" width="16" height="26" rx="8" fill="${color}" stroke="${INK}" stroke-width="5"/>
  <rect x="76" y="44" width="16" height="26" rx="8" fill="${color}" stroke="${INK}" stroke-width="5"/>
  <rect x="16" y="20" width="64" height="64" rx="22" fill="${color}" stroke="${INK}" stroke-width="5"/>
  <rect x="28" y="38" width="40" height="28" rx="14" fill="${INK}"/>
  <circle cx="48" cy="52" r="9" fill="${eyeColor}"/>
  <circle cx="44" cy="48" r="3" fill="#FFFFFF" opacity="0.9"/>
  <rect x="34" y="74" width="28" height="5" rx="2.5" fill="${INK}" opacity="0.35"/>
</svg>
`;

/* ------------------------------------------------------------------ build */
const FILES = {
  // Nova — beş poz. Amber gözler varsayılan; koyu zeminde de açık zeminde de çalışır.
  "nova-float": nova("float"),
  "nova-wave": nova("wave"),
  "nova-cheer": nova("cheer"),
  "nova-point": nova("point"),
  "nova-think": nova("think"),
  // Gözü mint olan bir varyant: yeşil/mint ağırlıklı postlarda Nova'yı yeniden anahtarlar.
  "nova-float-mint": nova("float", { eyeColor: MINT }),

  // Sahne parçaları
  "star-amber": star(AMBER),
  "star-mint": star(MINT),
  "star-coral": star("#FF6B8A"),
  "star-blue": star("#9BE7FF"),
  "planet-violet": planet("#8B6BFF"),
  "planet-coral": planet("#FF6B8A"),
  "comet-mint": comet(MINT),
  "rocket": rocket(),
  "bit-blue": bit(),
};

/** PNG uzun kenarı. 1600 px Instagram'da 1080'lik bir karede %100 boyutta bile net. */
const PNG_LONG_EDGE = 1600;

await mkdir(SVG_DIR, { recursive: true });
await mkdir(PNG_DIR, { recursive: true });

for (const [name, svg] of Object.entries(FILES)) {
  await writeFile(join(SVG_DIR, `${name}.svg`), svg, "utf8");

  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  const scale = PNG_LONG_EDGE / Math.max(w, h);

  await sharp(Buffer.from(svg), { density: 72 * scale })
    .resize({
      width: Math.round(w * scale),
      height: Math.round(h * scale),
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(join(PNG_DIR, `${name}.png`));

  console.log(`✓ ${name}  ${w}×${h} → png ${Math.round(w * scale)}×${Math.round(h * scale)}`);
}

console.log(`\n${Object.keys(FILES).length} parça yazıldı:\n  ${SVG_DIR}\n  ${PNG_DIR}`);
