/**
 * Nebula Genç Zeka — kaset (cast) dışa aktarıcı.
 *
 * Nova ve sahne parçaları sitede React bileşeni olarak yaşıyor
 * (web/src/components/cast/). Bu script aynı geometriyi bağımsız .svg ve .png
 * dosyalarına çıkarır, böylece Instagram / Canva / Claude Design gibi kodun
 * olmadığı yerlerde de aynı karakter kullanılabilir.
 *
 * Çalıştır:
 *   node brand-kit/build.mjs                 → bütün seti üret (svg + png)
 *   node brand-kit/build.mjs --list          → poz / bakış / göz seçeneklerini yaz
 *   node brand-kit/build.mjs --pose point --facing right --eyes happy --name nova-ozel
 *                                           → tek bir özel varyant üret
 *
 * Nova'nın dört ekseni var; hepsi bağımsız birleşir:
 *   pose    kol ve bacak geometrisi
 *   facing  gövde aynı kalır, kafa/vizör/göğüs paneli o yana döner
 *   eyes    vizördeki iki ışığın şekli (tek ifade kaynağı — yüz yok)
 *   lean    bütün figürün eğimi (uçuş, düşüş, yaslanma)
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
/**
 * Kol, omuzdan çıkan tek bir doğru parçası. `limb(omuzX, omuzY, açı, uzunluk)`
 * onu üç parçaya çevirir: boru (d), bileğe yakın amber manşet (cuff) ve
 * ucundaki krem eldiven (hand).
 *
 * Açı SVG düzeninde derece:  0° sağ · 90° AŞAĞI · -90° yukarı · 180° sol.
 * (y ekseni aşağı baktığı için negatif açı yukarı demek.)
 * Omuzlar sabit: sol (74, 134), sağ (126, 134). Kol boyu 34–48 arası durur.
 */
const r1 = (n) => Math.round(n * 10) / 10;

function limb(sx, sy, deg, len) {
  const a = (deg * Math.PI) / 180;
  const ex = sx + Math.cos(a) * len;
  const ey = sy + Math.sin(a) * len;
  const at = (t) => [r1(sx + (ex - sx) * t), r1(sy + (ey - sy) * t)];
  const [c0x, c0y] = at(0.56);
  const [c1x, c1y] = at(0.93);
  return {
    d: `M${sx} ${sy}L${r1(ex)} ${r1(ey)}`,
    cuff: `M${c0x} ${c0y}L${c1x} ${c1y}`,
    hand: [r1(sx + Math.cos(a) * (len + 6)), r1(sy + Math.sin(a) * (len + 6))],
  };
}

/** Dirsekten kırılan kol: omuz → dirsek → el. Aynı iki çizgi hilesi çalışır. */
function bentLimb(sx, sy, ex, ey, hx, hy) {
  const t = (ax, ay, bx, by, k) => [r1(ax + (bx - ax) * k), r1(ay + (by - ay) * k)];
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

const LS = [74, 134]; // sol omuz
const RS = [126, 134]; // sağ omuz
const L = (deg, len) => limb(LS[0], LS[1], deg, len);
const R = (deg, len) => limb(RS[0], RS[1], deg, len);

/* --- bacak setleri ------------------------------------------------------ */
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

/** Yürüyüş — duyuru ve "devam" karelerinde figürü hareket ettirir. */
const STRIDE = {
  left: "M88 174L74 198",
  leftBoot: "M74 202L59 203",
  right: "M112 174L122 200",
  rightBoot: "M122 204L137 202",
};

/** Zıplama — iki diz dışa kırık. */
const JUMP = {
  left: "M89 174L70 188L76 204",
  leftBoot: "M77 207L62 209",
  right: "M111 174L130 188L124 204",
  rightBoot: "M123 207L138 209",
};

/** Süzülme, bacaklar neredeyse düz — havada asılı dururken TUCK'tan sakin. */
const DANGLE = {
  left: "M89 176L84 205",
  leftBoot: "M84 208L69 209",
  right: "M111 176L116 205",
  rightBoot: "M116 208L131 209",
};

/**
 * Pozlar. İlk beşi sitenin kullandığı orijinal el yazımı koordinatlar —
 * birebir korunuyor ki üretilen dosyalar sitedeki Nova'dan sapmasın.
 * Gerisi limb() ile üretiliyor; yeni poz eklemek bir satır.
 */
const LEG_SETS = { STAND, TUCK, STRIDE, JUMP, DANGLE };
const legName = (l) => Object.entries(LEG_SETS).find(([, v]) => v === l)?.[0] ?? "?";

const POSES = {
  /* --- sitedeki orijinal beş poz (dokunma) --- */
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

  /* --- gösterme ailesi --- */
  /** Solu gösteriyor. `point`in aynası; carousel'de "geri". */
  "point-left": { left: L(190, 36), right: R(62, 34), legs: STAND },
  /** Yukarıyı gösteriyor. Kol dirsekten kırılıp kaskın yanından dolaşıyor —
   *  düz yukarı uzatılan bir kol kaskın arkasında kaybolurdu. */
  "point-up": { left: L(112, 34), right: bentLimb(126, 134, 172, 124, 180, 56), legs: STAND },
  /** Aşağıyı gösteriyor. "Aşağı kaydır", "detay altta". */
  "point-down": { left: L(112, 34), right: R(38, 44), legs: STAND },
  /** Uzun kol, tam yatay: yanına konan büyük bir görselin tamamını işaret eder. */
  "point-far": { left: L(112, 34), right: R(-8, 48), legs: STAND },

  /* --- el / kol --- */
  /** Sol elle sallıyor. `wave`in aynası. */
  "wave-left": { left: L(215, 48), right: R(62, 36), legs: STAND },
  /** Tek kol havada, sağ. `cheer`in yarısı — daha sakin bir "evet". */
  "raise-right": { left: L(104, 34), right: R(-48, 54), legs: STAND },
  /** Tek kol havada, sol. */
  "raise-left": { left: L(228, 54), right: R(76, 34), legs: STAND },
  /** Avuç açık sunuş: "işte burada". Yanına ürün/kart koy. */
  "present-right": { left: L(114, 33), right: R(14, 46), legs: STAND },
  /** Sunuş, sol. */
  "present-left": { left: L(166, 46), right: R(66, 33), legs: STAND },
  /** Selam. Sağ kol kaskın ÖNÜNDE çiziliyor (`front`), yoksa el vizörün
   *  arkasında kalır ve hareket okunmaz. */
  salute: {
    left: L(100, 34),
    right: bentLimb(126, 134, 168, 112, 142, 56),
    front: "right",
    legs: STAND,
  },
  /** Omuz silkme: "bilmiyorum", "sence?". İki avuç yukarı, kollar kısa. */
  shrug: { left: L(196, 34), right: R(-16, 34), legs: STAND },
  /** İki el iki yanda, neredeyse yatay: aradaki boşluğa tabela/kart koy.
   *  Nesne gövdeyi örter, eller nesnenin iki ucundan tutuyormuş gibi durur. */
  hold: { left: L(174, 48), right: R(6, 48), legs: STAND },
  /** Eller belde. Kararlı duruş, "hadi başlayalım". */
  hips: {
    left: bentLimb(74, 134, 42, 152, 56, 176),
    right: bentLimb(126, 134, 158, 152, 144, 176),
    legs: STAND,
  },
  /** Kollar iki yana açık, kucaklama / "hepsi burada". */
  open: { left: L(158, 44), right: R(22, 44), legs: STAND },

  /* --- hareket --- */
  /** Uçuş. `lean:-24` ile birlikte kullan: bir kol ileri, biri geride. */
  fly: { left: L(120, 40), right: R(-16, 48), legs: TUCK },
  /** Zıplama / kutlama. İki kol yukarı-dışa, dizler kırık. */
  jump: { left: L(230, 56), right: R(-50, 56), legs: JUMP },
  /** Yürüyor, kollar sallanıyor. */
  walk: { left: L(122, 36), right: R(52, 36), legs: STRIDE },
  /** Havada asılı, kollar aşağı. En sakin duruş — uzun metnin yanında. */
  hover: { left: L(120, 36), right: R(60, 36), legs: DANGLE },
};

/* --------------------------------------------------------------- gözler */
/**
 * Vizörde yüz yok: bütün ifade iki ışığın şeklinden geliyor. Işıkların
 * merkezleri her varyantta aynı yerde (85.5 ve 114.5, y 72) — sadece şekil
 * değişiyor, böylece hiçbir ifade "başka bir karakter" gibi durmuyor.
 */
const EYE_CX = [85.5, 114.5];
const EYE_CY = 72;

const rectEye = (w, h, gw, gh) => (color) =>
  EYE_CX.map(
    (cx) => `
    <rect x="${r1(cx - gw / 2)}" y="${r1(EYE_CY - gh / 2)}" width="${gw}" height="${gh}" rx="${r1(Math.min(gw, gh) / 2)}" fill="${color}" opacity="0.22"/>`,
  ).join("") +
  EYE_CX.map(
    (cx) => `
    <rect x="${r1(cx - w / 2)}" y="${r1(EYE_CY - h / 2)}" width="${w}" height="${h}" rx="${r1(Math.min(w, h) / 2)}" fill="${color}"/>`,
  ).join("");

const EYES = {
  /** Varsayılan. Yuvarlak dikdörtgen ışık — sakin, dostane. */
  default: (color) => `
    <rect x="73" y="57" width="25" height="30" rx="12" fill="${color}" opacity="0.22"/>
    <rect x="102" y="57" width="25" height="30" rx="12" fill="${color}" opacity="0.22"/>
    <rect x="77" y="61" width="17" height="22" rx="8.5" fill="${color}"/>
    <rect x="106" y="61" width="17" height="22" rx="8.5" fill="${color}"/>`,
  /** Şaşkın / heyecanlı. "Vay be", büyük duyuru. */
  wide: rectEye(21, 27, 29, 35),
  /** Odaklanmış / ciddi. Dar ışık; teknik konu, uyarı. */
  focus: rectEye(11, 24, 19, 32),
  /** Kapalı. Uyku, bir an duraklama, "kss". */
  closed: rectEye(19, 5.5, 27, 11),
  /** Gülen göz: yukarı kıvrık yay. Ağız değil — ışığın şekli. */
  happy: (color) =>
    EYE_CX.map(
      (cx) => `
    <path d="M${r1(cx - 10)} ${EYE_CY + 6}Q${cx} ${EYE_CY - 12} ${r1(cx + 10)} ${EYE_CY + 6}" stroke="${color}" stroke-width="15" stroke-linecap="round" opacity="0.22" fill="none"/>`,
    ).join("") +
    EYE_CX.map(
      (cx) => `
    <path d="M${r1(cx - 10)} ${EYE_CY + 6}Q${cx} ${EYE_CY - 12} ${r1(cx + 10)} ${EYE_CY + 6}" stroke="${color}" stroke-width="7" stroke-linecap="round" fill="none"/>`,
    ).join(""),
};

/* --------------------------------------------------------------- bakış */
/**
 * Gövde yerinde kalır, kafa döner: vizör, ışıklar, imza yıldızı ve göğüs
 * paneli o yana kayar; uzaktaki kask podu küçülür, yakındaki dışa çıkar.
 * Düz kâğıt üslubunda 3/4 dönüşü taklit etmenin en ucuz yolu bu — hiçbir
 * şekli yeniden çizmek gerekmiyor.
 */
const FACINGS = {
  front: { visor: 0, eyes: 0, star: 0, panel: 0, near: 154, far: 46, nearR: 11, farR: 11, nearRy: 17, farRy: 17 },
  right: { visor: 6, eyes: 10, star: 6, panel: 5, near: 157, far: 50, nearR: 12, farR: 8, nearRy: 18, farRy: 14 },
  left: { visor: -6, eyes: -10, star: -6, panel: -5, near: 43, far: 150, nearR: 12, farR: 8, nearRy: 18, farRy: 14 },
};

const arm = (l) => `
  <path d="${l.d}" stroke="${INK}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="${l.d}" stroke="${SUIT}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="${l.cuff}" stroke="${AMBER}" stroke-width="19" stroke-linecap="butt" fill="none"/>
  <circle cx="${l.hand[0]}" cy="${l.hand[1]}" r="13" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>`;

const leg = (d, boot) => `
  <path d="${d}" stroke="${INK}" stroke-width="25" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="${d}" stroke="${SUIT}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="${boot}" stroke="${INK}" stroke-width="29" stroke-linecap="round" fill="none"/>
  <path d="${boot}" stroke="${AMBER}" stroke-width="22" stroke-linecap="round" fill="none"/>`;

function nova(poseName, { eyeColor = AMBER, eyes = "default", facing = "front", lean = 0 } = {}) {
  const p = POSES[poseName];
  if (!p) throw new Error(`Bilinmeyen poz: ${poseName}`);
  const f = FACINGS[facing];
  if (!f) throw new Error(`Bilinmeyen bakış: ${facing}`);
  const eye = EYES[eyes];
  if (!eye) throw new Error(`Bilinmeyen göz: ${eyes}`);

  const nearIsRight = facing !== "left";
  const podL = nearIsRight ? { cx: f.far, rx: f.farR, ry: f.farRy } : { cx: f.near, rx: f.nearR, ry: f.nearRy };
  const podR = nearIsRight ? { cx: f.near, rx: f.nearR, ry: f.nearRy } : { cx: f.far, rx: f.farR, ry: f.farRy };

  // Eğim varsa viewBox'ı genişlet: dönen figürün anteni ve eli kadraja taşar.
  const box = lean ? "-26 -18 252 272" : "0 0 200 236";
  const open = lean ? `<g transform="rotate(${lean} 100 118)">` : "";
  const close = lean ? `</g>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" fill="none" role="img" aria-label="Nova, Nebula'nın astronotu">
  <title>Nova — ${poseName}${facing !== "front" ? ` / ${facing}` : ""}${eyes !== "default" ? ` / ${eyes}` : ""}</title>
${open}
  <!-- anten -->
  <path d="M134 38L164 12" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
  <path d="M134 38L164 12" stroke="${SUIT}" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="166" cy="11" r="9" fill="${AMBER}" stroke="${INK}" stroke-width="6"/>

  <!-- yaşam destek sırt ünitesi -->
  <rect x="62" y="112" width="76" height="62" rx="24" fill="${SUIT_SHADE}" stroke="${INK}" stroke-width="7"/>
${leg(p.legs.left, p.legs.leftBoot)}
${leg(p.legs.right, p.legs.rightBoot)}
${p.front === "left" ? "" : arm(p.left)}
${p.front === "right" ? "" : arm(p.right)}

  <!-- gövde -->
  <rect x="66" y="108" width="68" height="78" rx="27" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>

  <!-- göğüs paneli -->
  <g transform="translate(${f.panel} 0)">
    <rect x="83" y="132" width="34" height="26" rx="8" fill="${SUIT}" stroke="${INK}" stroke-width="5"/>
    <circle cx="93" cy="141" r="3.6" fill="${MINT}"/>
    <circle cx="93" cy="150" r="3.6" fill="${AMBER}"/>
    <rect x="101" y="139" width="11" height="4" rx="2" fill="${INK}" opacity="0.35"/>
    <rect x="101" y="147" width="8" height="4" rx="2" fill="${INK}" opacity="0.22"/>
  </g>

  <!-- kask yan podları -->
  <ellipse cx="${podL.cx}" cy="74" rx="${podL.rx}" ry="${podL.ry}" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>
  <ellipse cx="${podR.cx}" cy="74" rx="${podR.rx}" ry="${podR.ry}" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>

  <!-- kask + vizör -->
  <circle cx="100" cy="72" r="56" fill="${SUIT}" stroke="${INK}" stroke-width="7"/>
  <circle cx="${100 + f.visor}" cy="72" r="43" fill="${VISOR}"/>

  <!-- gözler (yüz yok, sadece iki ışık) -->
  <g transform="translate(${f.eyes} 0)">${eye(eyeColor)}
  </g>

  <!-- vizördeki yıldız yansıması: Nova'nın imzası, hep sağ üstte -->
  <path d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z" fill="#FFFFFF" opacity="0.95" transform="translate(${f.star} 0)"/>
${p.front ? `\n  <!-- kaskın önündeki kol: selam, el çenede gibi vizöre değen hareketler -->${arm(p.front === "left" ? p.left : p.right)}` : ""}
${close}
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
  /* --- Nova, temel beş poz (sitedeki hâliyle) --- */
  "nova-float": nova("float"),
  "nova-wave": nova("wave"),
  "nova-cheer": nova("cheer"),
  "nova-point": nova("point"),
  "nova-think": nova("think"),
  "nova-float-mint": nova("float", { eyeColor: MINT }),

  /* --- gösterme: düz ve o yana dönük hâlleri --- */
  "nova-point-turned": nova("point", { facing: "right" }),
  "nova-point-left": nova("point-left"),
  "nova-point-left-turned": nova("point-left", { facing: "left" }),
  "nova-point-up": nova("point-up", { eyes: "wide" }),
  "nova-point-down": nova("point-down"),
  "nova-point-far": nova("point-far", { facing: "right" }),

  /* --- el / kol --- */
  "nova-wave-left": nova("wave-left", { facing: "left" }),
  "nova-raise-right": nova("raise-right"),
  "nova-raise-left": nova("raise-left"),
  "nova-present-right": nova("present-right", { facing: "right" }),
  "nova-present-left": nova("present-left", { facing: "left" }),
  "nova-salute": nova("salute"),
  "nova-shrug": nova("shrug", { eyes: "focus" }),
  "nova-hold": nova("hold"),
  "nova-hips": nova("hips"),
  "nova-open": nova("open", { eyes: "happy" }),

  /* --- hareket --- */
  "nova-fly": nova("fly", { lean: -24, eyes: "focus" }),
  "nova-jump": nova("jump", { eyes: "happy" }),
  "nova-walk": nova("walk"),
  "nova-hover": nova("hover"),

  /* --- ifade varyantları (aynı poz, farklı ışık) --- */
  "nova-happy": nova("float", { eyes: "happy" }),
  "nova-wow": nova("cheer", { eyes: "wide" }),
  "nova-sleep": nova("hover", { eyes: "closed" }),
  "nova-focus": nova("think", { eyes: "focus", facing: "right" }),

  /* --- sahne parçaları --- */
  "star-amber": star(AMBER),
  "star-mint": star(MINT),
  "star-coral": star("#FF6B8A"),
  "star-blue": star("#9BE7FF"),
  "planet-violet": planet("#8B6BFF"),
  "planet-coral": planet("#FF6B8A"),
  "comet-mint": comet(MINT),
  rocket: rocket(),
  "bit-blue": bit(),
};

/** PNG uzun kenarı. 1600 px Instagram'da 1080'lik bir karede %100 boyutta bile net. */
const PNG_LONG_EDGE = 1600;

async function emit(name, svg) {
  await writeFile(join(SVG_DIR, `${name}.svg`), svg, "utf8");

  const [, x, y, w, h] = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/).map(Number);
  void x;
  void y;
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

/* --------------------------------------------------------------- CLI */
const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : argv[i + 1];
};

await mkdir(SVG_DIR, { recursive: true });
await mkdir(PNG_DIR, { recursive: true });

if (argv.includes("--list")) {
  console.log(`pozlar   : ${Object.keys(POSES).join(", ")}`);
  console.log(`bakış    : ${Object.keys(FACINGS).join(", ")}`);
  console.log(`gözler   : ${Object.keys(EYES).join(", ")}`);
  console.log(`eğim     : --lean -30..30 (derece, uçuş/düşüş için)`);
  console.log(`\nörnek: node brand-kit/build.mjs --pose point-up --facing right --eyes wide --name nova-duyuru`);
} else if (flag("pose")) {
  const name = flag("name") ?? `nova-${flag("pose")}`;
  await emit(
    name,
    nova(flag("pose"), {
      facing: flag("facing") ?? "front",
      eyes: flag("eyes") ?? "default",
      eyeColor: flag("eye-color") ?? AMBER,
      lean: Number(flag("lean") ?? 0),
    }),
  );
} else {
  for (const [name, svg] of Object.entries(FILES)) await emit(name, svg);
  console.log(`\n${Object.keys(FILES).length} parça yazıldı:\n  ${SVG_DIR}\n  ${PNG_DIR}`);
}

/* ------------------------------------------------------------------ docs */
/**
 * Poz verisini dokümana yazar. CLAUDE-DESIGN.md'nin Nova bölümü elle
 * yazılmıyor — burada üretilip iki işaretin arasına gömülüyor, böylece
 * geometri değiştiğinde doküman sessizce yanlış kalmıyor.
 */
function poseDocs() {
  const line = (n, l) => `${n.padEnd(9)} d="${l.d}"  cuff="${l.cuff}"  el=(${l.hand[0]}, ${l.hand[1]})`;
  const poses = Object.entries(POSES)
    .map(([name, p]) => {
      const front = p.front ? `\n${"öndeki".padEnd(9)} ${p.front === "left" ? "sol" : "sağ"} kol kaskın ÜSTÜNE çizilir` : "";
      return `**${name}**\n\`\`\`\n${line("sol kol", p.left)}\n${line("sağ kol", p.right)}\n${"bacak".padEnd(9)} ${legName(p.legs)}${front}\n\`\`\``;
    })
    .join("\n\n");

  const legs = Object.entries(LEG_SETS)
    .map(
      ([name, l]) =>
        `**${name}**\n\`\`\`\nsol  d="${l.left}"   bot="${l.leftBoot}"\nsağ  d="${l.right}"   bot="${l.rightBoot}"\n\`\`\``,
    )
    .join("\n\n");

  const eyes = Object.entries(EYES)
    .map(([name, fn]) => `**${name}**\n\`\`\`svg${fn("#FF9F45").replace(/\n\s+/g, "\n")}\n\`\`\``)
    .join("\n\n");

  const facings = Object.entries(FACINGS)
    .map(([name, f]) => {
      const l = name === "left" ? f : { near: f.far, nearR: f.farR, nearRy: f.farRy, far: f.near, farR: f.nearR, farRy: f.nearRy };
      return `**${name}** — vizör \`cx="${100 + f.visor}"\` · gözler \`translate(${f.eyes} 0)\` · imza yıldızı \`translate(${f.star} 0)\` · göğüs paneli \`translate(${f.panel} 0)\` · sol pod \`cx="${name === "left" ? f.near : f.far}" rx="${name === "left" ? f.nearR : f.farR}" ry="${name === "left" ? f.nearRy : f.farRy}"\` · sağ pod \`cx="${name === "left" ? f.far : f.near}" rx="${name === "left" ? f.farR : f.nearR}" ry="${name === "left" ? f.farRy : f.nearRy}"\``;
    })
    .join("\n\n");

  return `### Taban gövde — her Nova bununla başlar

Aşağıdaki kod eksiksiz bir Nova. Üç yere dokunuyorsun: \`BACAKLAR\`, \`KOLLAR\`
ve \`GÖZLER\`. Gerisi sabit — gövde, kask, anten, göğüs paneli, imza yıldızı
hiçbir varyantta değişmez. Sıralama da sabit: kollar gövdenin ve kaskın
ALTINDA kalır.

\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 236" fill="none">
  <!-- anten -->
  <path d="M134 38L164 12" stroke="#152343" stroke-width="9" stroke-linecap="round"/>
  <path d="M134 38L164 12" stroke="#FFFBF2" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="166" cy="11" r="9" fill="#FF9F45" stroke="#152343" stroke-width="6"/>

  <!-- sırt ünitesi -->
  <rect x="62" y="112" width="76" height="62" rx="24" fill="#E7DCC6" stroke="#152343" stroke-width="7"/>

  <!-- BACAKLAR buraya -->
  <!-- KOLLAR buraya -->

  <!-- gövde -->
  <rect x="66" y="108" width="68" height="78" rx="27" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>

  <!-- göğüs paneli -->
  <rect x="83" y="132" width="34" height="26" rx="8" fill="#FFFBF2" stroke="#152343" stroke-width="5"/>
  <circle cx="93" cy="141" r="3.6" fill="#2FD08A"/>
  <circle cx="93" cy="150" r="3.6" fill="#FF9F45"/>
  <rect x="101" y="139" width="11" height="4" rx="2" fill="#152343" opacity="0.35"/>
  <rect x="101" y="147" width="8" height="4" rx="2" fill="#152343" opacity="0.22"/>

  <!-- kask yan podları -->
  <ellipse cx="46" cy="74" rx="11" ry="17" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>
  <ellipse cx="154" cy="74" rx="11" ry="17" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>

  <!-- kask + vizör -->
  <circle cx="100" cy="72" r="56" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>
  <circle cx="100" cy="72" r="43" fill="#101B38"/>

  <!-- GÖZLER buraya -->

  <!-- imza yıldızı: hep sağ üstte -->
  <path d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z" fill="#FFFFFF" opacity="0.95"/>
</svg>
\`\`\`

Bir kol her zaman şu dört parça — biri eksilirse kol kol olmaktan çıkar:

\`\`\`svg
<path d="{d}"    stroke="#152343" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{d}"    stroke="#FFFBF2" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{cuff}" stroke="#FF9F45" stroke-width="19" stroke-linecap="butt" fill="none"/>
<circle cx="{el.x}" cy="{el.y}" r="13" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>
\`\`\`

Bacak da dört parça:

\`\`\`svg
<path d="{d}"   stroke="#152343" stroke-width="25" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{d}"   stroke="#FFFBF2" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{bot}" stroke="#152343" stroke-width="29" stroke-linecap="round" fill="none"/>
<path d="{bot}" stroke="#FF9F45" stroke-width="22" stroke-linecap="round" fill="none"/>
\`\`\`

### Bacak setleri

${legs}

### Pozlar — ${Object.keys(POSES).length} hazır poz

${poses}

### Gözler — tek ifade kanalı

Işıkların merkezi her varyantta aynı: (85.5, 72) ve (114.5, 72). Sadece şekil
değişir; bu yüzden hiçbir ifade "başka bir karakter" gibi durmaz.

${eyes}

### Bakış — gövde durur, kafa döner

Gövdeye, kollara, bacaklara dokunma. Sadece şunlar kayar:

${facings}

### Eğim

Bütün içeriği \`<g transform="rotate(AÇI 100 118)">\` içine al ve viewBox'ı
\`-26 -18 252 272\` yap (dönen figürün anteni ve eli yoksa kadraja taşar).
Uçuş için -24°, atılım için +18° iyi çalışıyor. Eğim yoksa viewBox
\`0 0 200 236\` kalır.
`;
}

if (argv.includes("--docs") || (!argv.includes("--list") && !flag("pose"))) {
  const { readFile } = await import("node:fs/promises");
  const docPath = join(ROOT, "CLAUDE-DESIGN.md");
  try {
    const md = await readFile(docPath, "utf8");
    const a = md.indexOf("<!-- NOVA:BEGIN");
    const b = md.indexOf("<!-- NOVA:END -->");
    if (a !== -1 && b !== -1) {
      await writeFile(
        docPath,
        `${md.slice(0, a)}<!-- NOVA:BEGIN — bu blok build.mjs tarafından üretiliyor, elle düzenleme -->\n\n${poseDocs()}\n${md.slice(b)}`,
        "utf8",
      );
      console.log("✓ CLAUDE-DESIGN.md — Nova bölümü güncellendi");
    }
  } catch {
    /* doküman henüz yoksa sessiz geç */
  }
}
