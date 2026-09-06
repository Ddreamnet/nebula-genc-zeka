/**
 * Tarif kartları — the prompt formulas, as fillable forms.
 *
 * A prompt is made of parts, and that is the single idea the whole curriculum
 * is built on: the trial lesson's ÖZNE + SAHNE + STİL + TEKNİK, week 1's
 * fill-in-the-blank tarif kartı, week 2's ROL + GÖREV + BAĞLAM + FORMAT.
 * Students were being asked to hold that structure in their heads and type it
 * out. These cards put the structure on screen instead: tap through the fields,
 * watch the sentence assemble underneath, then edit a word and send it.
 *
 * ---------------------------------------------------------------------------
 * Two decisions worth knowing before adding a card:
 *
 * 1. **Options are a vocabulary, not a menu.** Every chip is a real term from
 *    the craft — "dolly in", "85mm portre", "altın saat", "arpej gitar". A kid
 *    who taps six of them has written a prompt a professional would recognise,
 *    and has met six words they can now use deliberately. That is the point of
 *    the card; a list of vague adjectives would not be worth building.
 *
 * 2. **Optional fields stay out when blank.** A required field falls back to
 *    its placeholder so a half-filled card still produces something runnable;
 *    an optional one simply disappears. Without that split, the video card's
 *    twenty fields would force twenty clauses into every prompt and the
 *    student's own idea would be buried under defaults they never chose.
 *
 * Groups marked `advanced` start collapsed. A ten-year-old opens the card and
 * sees four boxes; the same card has eighteen when someone wants them. Same
 * card, two audiences, no second UI.
 * ---------------------------------------------------------------------------
 */
import type { ToolModality } from "@/lib/playground/tools";

export interface PromptCardField {
  key: string;
  /** Printed on the form, in the deck's own casing where one exists. */
  label: string;
  /** Also the fallback value for a required field left blank. */
  placeholder: string;
  /** Tappable vocabulary. Free typing always stays available. */
  options?: string[];
  /** Blank means "leave this clause out" rather than "use the placeholder". */
  optional?: boolean;
  /** Words glued in front of the value, for clauses that need a preposition. */
  prefix?: string;
  /** Renders a textarea — for the fields that are a sentence, not a term. */
  long?: boolean;
}

export interface PromptCardGroup {
  label: string;
  /** One line under the group heading, when the grouping needs explaining. */
  hint?: string;
  /** Starts collapsed: real craft controls, not the first four boxes. */
  advanced?: boolean;
  fields: PromptCardField[];
}

export interface PromptCard {
  id: string;
  name: string;
  /** One line on what this card is for — shown in the picker list. */
  purpose: string;
  /** Where it comes from: a lesson week, or the craft it borrows from. */
  source: string;
  /** Which tools offer it. */
  modalities: ToolModality[];
  groups: PromptCardGroup[];
  /**
   * Custom assembly, for the cards whose formula is a sentence rather than a
   * list of clauses. Omit to get the default comma joiner.
   */
  build?: (values: Record<string, string>, get: (key: string) => string) => string;
}

export function cardFields(card: PromptCard): PromptCardField[] {
  return card.groups.flatMap((g) => g.fields);
}

/** A field's effective value: what was typed, or the placeholder if required. */
function valueOf(field: PromptCardField, values: Record<string, string>): string {
  const typed = (values[field.key] ?? "").trim();
  if (typed) return typed;
  return field.optional ? "" : field.placeholder;
}

export function buildPrompt(card: PromptCard, values: Record<string, string>): string {
  const fields = cardFields(card);
  if (card.build) {
    const get = (key: string) => {
      const field = fields.find((f) => f.key === key);
      return field ? valueOf(field, values) : "";
    };
    return card.build(values, get).replace(/\s+,/g, ",").replace(/,\s*,/g, ",").trim();
  }
  return fields
    .map((f) => {
      const v = valueOf(f, values);
      if (!v) return "";
      return f.prefix ? `${f.prefix} ${v}` : v;
    })
    .filter(Boolean)
    .join(", ");
}

// ===========================================================================
// GÖRSEL
// ===========================================================================

const STYLE_OPTIONS = [
  "karikatür",
  "piksel-art",
  "3D render",
  "anime",
  "suluboya",
  "yağlı boya",
  "çizgi roman",
  "origami",
  "kâğıt kesme",
  "vektör düz tasarım",
  "fotogerçekçi",
  "kil animasyon",
];

const LIGHT_OPTIONS = [
  "yumuşak gündüz ışığı",
  "altın saat",
  "mavi saat",
  "neon ışık",
  "mum ışığı",
  "stüdyo ışığı",
  "kontra ışık",
  "dramatik tek kaynak",
];

const MOOD_OPTIONS = ["neşeli", "gizemli", "sakin", "enerjik", "epik", "melankolik", "sıcak ve samimi", "gerilimli"];

const avatarCard: PromptCard = {
  id: "avatar",
  name: "Avatar kartı",
  purpose: "Kendini tarif et, sticker'a dönüşsün",
  source: "Hafta 1 · LAB Adım 1",
  modalities: ["image"],
  groups: [
    {
      label: "SEN",
      fields: [
        { key: "sac", label: "SAÇ", placeholder: "kıvırcık kahverengi saç", options: ["kıvırcık kahverengi saç", "uzun siyah saç", "kısa sarı saç", "at kuyruğu", "örgülü saç", "dağınık kızıl saç"] },
        { key: "gozluk", label: "GÖZLÜK", placeholder: "yuvarlak gözlük", options: ["yuvarlak gözlük", "gözlüksüz", "güneş gözlüğü", "kalın çerçeveli gözlük"] },
        { key: "kiyafet", label: "KIYAFET", placeholder: "kapüşonlu sweatshirt", options: ["kapüşonlu sweatshirt", "uzay kıyafeti", "spor forması", "kot ceket", "laboratuvar önlüğü", "şövalye zırhı"] },
        { key: "renk", label: "RENK", placeholder: "turkuaz", options: ["turkuaz", "kırmızı", "mor", "neon yeşil", "turuncu", "lacivert"] },
        { key: "ifade", label: "İFADE", placeholder: "neşeli", options: ["neşeli", "meraklı", "sakin", "kararlı", "şaşkın", "muzip"] },
      ],
    },
    {
      label: "GÖRÜNÜŞ",
      fields: [{ key: "stil", label: "STİL", placeholder: "karikatür avatar", options: ["karikatür avatar", "piksel-art", "3D render", "anime", "kâğıt kesme"] }],
    },
    {
      label: "EKSTRA",
      advanced: true,
      hint: "Boş bırakırsan tarife hiç girmez.",
      fields: [
        { key: "aksesuar", label: "AKSESUAR", placeholder: "", optional: true, prefix: "yanında", options: ["küçük bir robot", "uçan bir kitap", "kedisi", "gitarı", "kaykayı"] },
        { key: "arkaplan", label: "ARKA PLAN", placeholder: "", optional: true, options: ["tek renk pastel arka plan", "yıldızlı gökyüzü", "okul koridoru", "uzay istasyonu"] },
        { key: "yok", label: "OLMASIN", placeholder: "", optional: true, prefix: "olmasın:", options: ["yazı", "el", "kalabalık", "gerçekçi doku"] },
      ],
    },
  ],
  // The sentence printed on the slide, with the slots filled in.
  build: (_v, get) =>
    [
      `${get("sac")}, ${get("gozluk")}, ${get("renk")} ${get("kiyafet")} olan ${get("ifade")} bir karakter`,
      get("stil"),
      "büyük gözler",
      "kalın beyaz kenarlık",
      get("arkaplan") || "sade arka plan",
      "sticker tarzı",
      get("aksesuar") && `yanında ${get("aksesuar")}`,
      get("yok") && `olmasın: ${get("yok")}`,
    ]
      .filter(Boolean)
      .join(", "),
};

const sceneCard: PromptCard = {
  id: "sahne",
  name: "Sahne kartı",
  purpose: "Dört parçalı tarif formülü — her görsel için",
  source: "Deneme dersi · Tarif formülü",
  modalities: ["image"],
  groups: [
    {
      label: "DÖRT PARÇA",
      hint: "ÖZNE + SAHNE + STİL + TEKNİK",
      fields: [
        { key: "ozne", label: "ÖZNE", placeholder: "uzay kıyafetli tek bir kedi, zıplıyor", long: true },
        { key: "sahne", label: "SAHNE", placeholder: "Ay'ın yüzeyinde, arka planda Dünya", long: true },
        { key: "stil", label: "STİL", placeholder: "çizgi roman", options: STYLE_OPTIONS },
        { key: "teknik", label: "TEKNİK", placeholder: "yumuşak ışık, alçak açı, geniş kadraj", options: ["yumuşak ışık, alçak açı, geniş kadraj", "neon ışık, yakın plan", "gün batımı, kuş bakışı", "35mm objektif, sığ alan derinliği", "makro çekim, keskin detay"] },
      ],
    },
    {
      label: "İNCE AYAR",
      advanced: true,
      fields: [
        { key: "duygu", label: "DUYGU", placeholder: "", optional: true, options: MOOD_OPTIONS },
        { key: "palet", label: "RENK PALETİ", placeholder: "", optional: true, options: ["pastel tonlar", "sıcak turuncu-kırmızı", "soğuk mavi-mor", "siyah beyaz", "sadece iki renk", "canlı doygun renkler"] },
        { key: "yok", label: "OLMASIN", placeholder: "", optional: true, prefix: "olmasın:", options: ["yazı", "insan", "logo", "çerçeve"] },
      ],
    },
  ],
};

const posterCard: PromptCard = {
  id: "afis",
  name: "Afiş & kapak kartı",
  purpose: "İçinde yazı olan, gerçekten kullanılabilir bir tasarım",
  source: "Hafta 7 · Tasarımcı gibi çalış",
  modalities: ["image"],
  groups: [
    {
      label: "İÇERİK",
      hint: "Görselin içine yazılacak metinleri tırnak içinde vermek en iyi sonucu verir.",
      fields: [
        { key: "tur", label: "NE AFİŞİ", placeholder: "film afişi", options: ["film afişi", "konser afişi", "kitap kapağı", "albüm kapağı", "etkinlik posteri", "spor turnuvası afişi", "bilim fuarı posteri"] },
        { key: "baslik", label: "BAŞLIK", placeholder: '"YILDIZ AVCILARI"' },
        { key: "altbaslik", label: "ALT BAŞLIK", placeholder: "", optional: true },
        { key: "gorsel", label: "ANA GÖRSEL", placeholder: "uzay gemisinin önünde duran genç bir kâşif", long: true },
      ],
    },
    {
      label: "TASARIM",
      fields: [
        { key: "duzen", label: "DÜZEN", placeholder: "başlık üstte, ana görsel ortada", options: ["başlık üstte, ana görsel ortada", "başlık altta, tam sayfa görsel", "sol yarı yazı sağ yarı görsel", "ortalanmış simetrik", "diyagonal dinamik yerleşim"] },
        { key: "tipografi", label: "YAZI KARAKTERİ", placeholder: "kalın blok harfler", options: ["kalın blok harfler", "el yazısı", "retro yuvarlak harfler", "ince zarif serif", "piksel yazı", "neon tüp yazı"] },
        { key: "palet", label: "RENK PALETİ", placeholder: "iki renkli kontrast", options: ["iki renkli kontrast", "pastel tonlar", "siyah-beyaz-kırmızı", "neon mor ve turkuaz", "retro turuncu ve krem", "altın ve lacivert"] },
        { key: "stil", label: "STİL", placeholder: "vektör düz tasarım", options: STYLE_OPTIONS },
      ],
    },
    {
      label: "İNCE AYAR",
      advanced: true,
      fields: [
        { key: "oran", label: "KENAR BOŞLUĞU", placeholder: "", optional: true, options: ["geniş kenar boşluğu", "kenardan taşan görsel", "çerçeveli"] },
        { key: "doku", label: "DOKU", placeholder: "", optional: true, options: ["kâğıt dokusu", "film greni", "temiz düz zemin", "eskitilmiş baskı"] },
        { key: "yok", label: "OLMASIN", placeholder: "", optional: true, prefix: "olmasın:", options: ["fazladan yazı", "watermark", "insan yüzü", "kalabalık detay"] },
      ],
    },
  ],
  // The title is the whole point of this card, and a comma-separated clause
  // list leaves the model guessing whether to draw it or read it. Saying
  // "üzerinde ... yazan" puts the text inside the picture, which is what
  // week 7 ("görselin içine kusursuz yazı yaz") is actually asking for.
  build: (_v, get) =>
    [
      `üzerinde ${get("baslik")} yazan bir ${get("tur")}`,
      get("altbaslik") && `alt başlık: ${get("altbaslik")}`,
      get("gorsel"),
      get("duzen"),
      `yazı karakteri: ${get("tipografi")}`,
      get("palet"),
      get("stil"),
      get("oran"),
      get("doku"),
      get("yok") && `olmasın: ${get("yok")}`,
    ]
      .filter(Boolean)
      .join(", "),
};

const logoCard: PromptCard = {
  id: "logo",
  name: "Logo kartı",
  purpose: "Bir markanın işareti — sade, okunur, ölçeklenebilir",
  source: "Hafta 7 · Hafta 16 (kendi markan)",
  modalities: ["image"],
  groups: [
    {
      label: "MARKA",
      fields: [
        { key: "isim", label: "MARKA ADI", placeholder: '"NEBULA"' },
        { key: "alan", label: "NE İŞİ YAPIYOR", placeholder: "çocuklar için yapay zeka atölyesi", long: true },
        { key: "bicim", label: "BİÇİM", placeholder: "simge + yazı yan yana", options: ["simge + yazı yan yana", "simge + yazı alt alta", "sadece harf (monogram)", "daire içine alınmış amblem", "rozet"] },
      ],
    },
    {
      label: "GÖRÜNÜŞ",
      fields: [
        { key: "simge", label: "SİMGE FİKRİ", placeholder: "yıldız tozundan bir beyin", long: true },
        { key: "stil", label: "STİL", placeholder: "sade vektör, düz renk", options: ["sade vektör, düz renk", "geometrik minimal", "el çizimi sıcak", "retro 70'ler", "teknolojik keskin çizgiler", "yuvarlak dostane"] },
        { key: "renk", label: "RENK", placeholder: "iki renk", options: ["tek renk", "iki renk", "siyah beyaz", "gradyansız canlı renkler", "lacivert ve turuncu"] },
      ],
    },
    {
      label: "KURALLAR",
      advanced: true,
      hint: "Logo için bunlar gerçekten fark yaratır.",
      fields: [
        { key: "zemin", label: "ZEMİN", placeholder: "düz beyaz zemin", options: ["düz beyaz zemin", "şeffaf zemin", "tek renk zemin"] },
        { key: "olcek", label: "OKUNURLUK", placeholder: "küçük boyutta da okunur, ince detay yok", options: ["küçük boyutta da okunur, ince detay yok", "detaylı amblem"] },
        { key: "yok", label: "OLMASIN", placeholder: "gölge, gradyan, 3D efekt, fotoğraf", optional: true, prefix: "olmasın:" },
      ],
    },
  ],
  build: (_v, get) =>
    [
      `${get("isim")} yazan bir logo`,
      `${get("alan")} için`,
      get("bicim"),
      `simge: ${get("simge")}`,
      get("stil"),
      get("renk"),
      get("zemin"),
      get("olcek"),
      get("yok") && `olmasın: ${get("yok")}`,
    ]
      .filter(Boolean)
      .join(", "),
};

const characterSheetCard: PromptCard = {
  id: "karakter",
  name: "Karakter sayfası",
  purpose: "Dönemin ana karakteri — her açıdan tutarlı",
  source: "Hafta 6 · Kendi karakterini yarat",
  modalities: ["image"],
  groups: [
    {
      label: "KARAKTER",
      fields: [
        { key: "kim", label: "KİM / NE", placeholder: "meraklı bir kâşif tilki", long: true },
        { key: "govde", label: "GÖVDE & YÜZ", placeholder: "yuvarlak hatlar, kocaman gözler", long: true },
        { key: "kiyafet", label: "KIYAFET", placeholder: "kırmızı pelerin ve deri çanta", long: true },
        { key: "aksesuar", label: "AKSESUAR", placeholder: "", optional: true, options: ["pusula", "gözlük", "sırt çantası", "asa", "fener"] },
      ],
    },
    {
      label: "SAYFA DÜZENİ",
      fields: [
        { key: "duzen", label: "DÜZEN", placeholder: "aynı karakterin önden, yandan ve arkadan görünüşü tek sayfada", options: ["aynı karakterin önden, yandan ve arkadan görünüşü tek sayfada", "üç farklı poz yan yana", "yüz ifadeleri tablosu", "boy karşılaştırma sayfası"] },
        { key: "stil", label: "STİL", placeholder: "temiz çizgi, düz renk", options: STYLE_OPTIONS },
        { key: "zemin", label: "ZEMİN", placeholder: "düz açık gri zemin, gölgesiz", options: ["düz açık gri zemin, gölgesiz", "beyaz zemin", "ızgara çizgili teknik sayfa"] },
      ],
    },
    {
      label: "TUTARLILIK",
      advanced: true,
      hint: "Karakterin haftalar boyunca aynı kalması bunlara bağlı.",
      fields: [
        { key: "palet", label: "RENK PALETİ", placeholder: "", optional: true, prefix: "renk paleti:", options: ["kırmızı, krem, kahve", "mavi, gri, beyaz", "yeşil, altın, siyah"] },
        { key: "isaret", label: "AYIRT EDİCİ İŞARET", placeholder: "", optional: true, prefix: "ayırt edici işareti:", options: ["sol kulağında çentik", "boynunda madalyon", "tek gözü farklı renk"] },
        { key: "yok", label: "OLMASIN", placeholder: "", optional: true, prefix: "olmasın:", options: ["yazı", "arka plan sahnesi", "birden fazla karakter"] },
      ],
    },
  ],
};

// ===========================================================================
// VİDEO — the deep one
// ===========================================================================

const cinematicCard: PromptCard = {
  id: "sinematik",
  name: "Sinematik çekim kartı",
  purpose: "Tek bir planı yönetmen gibi tarif et",
  source: "Hafta 9 · Film stüdyosu · sinema dili",
  modalities: ["video"],
  groups: [
    {
      label: "PLAN",
      hint: "Bir video tarifi bir CÜMLE değil, bir çekim emridir: kim, ne yapıyor, nerede.",
      fields: [
        { key: "ozne", label: "ÖZNE", placeholder: "kırmızı pelerinli genç bir kâşif", long: true },
        { key: "aksiyon", label: "AKSİYON", placeholder: "yavaşça başını kaldırıp gökyüzüne bakıyor", long: true },
        { key: "ortam", label: "ORTAM", placeholder: "terk edilmiş bir uzay limanının çatısında", long: true },
      ],
    },
    {
      label: "KAMERA",
      hint: "Bu dört alan, aynı sahneyi bambaşka bir sahne yapar.",
      fields: [
        { key: "olcek", label: "ÇEKİM ÖLÇEĞİ", placeholder: "orta boy plan", options: ["çok yakın plan (göz)", "yakın plan (yüz)", "omuz plan", "orta boy plan", "boy plan", "geniş plan", "çok geniş manzara planı"] },
        { key: "hareket", label: "KAMERA HAREKETİ", placeholder: "yavaş dolly in", options: ["sabit kamera", "yavaş dolly in", "dolly out", "yandan takip (tracking)", "pan (sağa çevirme)", "tilt (yukarı çevirme)", "kreyn ile yükselme", "karakterin etrafında yörünge (orbit)", "elde çekim, hafif titrek", "FPV drone dalışı"] },
        { key: "aci", label: "KAMERA AÇISI", placeholder: "göz hizası", options: ["göz hizası", "alçak açı (kahramanlaştıran)", "yüksek açı (küçülten)", "kuş bakışı", "omuz üstü", "yerden sürünme açısı", "eğik (dutch) açı"] },
        { key: "lens", label: "LENS", placeholder: "35mm", options: ["14mm ultra geniş", "24mm geniş", "35mm doğal", "50mm standart", "85mm portre, sığ alan derinliği", "135mm sıkıştırılmış tele", "makro"] },
      ],
    },
    {
      label: "IŞIK & RENK",
      fields: [
        { key: "isik", label: "IŞIK", placeholder: "altın saat", options: LIGHT_OPTIONS },
        { key: "yon", label: "IŞIK YÖNÜ", placeholder: "", optional: true, options: ["önden yumuşak", "yandan sert (chiaroscuro)", "arkadan kontra, silüet", "tepeden", "alttan ürkütücü"] },
        { key: "hava", label: "HAVA", placeholder: "", optional: true, options: ["açık", "sisli", "yağmurlu, ıslak zemin yansımaları", "karlı", "tozlu", "fırtınalı"] },
        { key: "palet", label: "RENK TONLAMASI", placeholder: "sıcak turuncu-mavi kontrast", options: ["sıcak turuncu-mavi kontrast", "soğuk mavi-yeşil", "soluk pastel", "yüksek kontrast siyah beyaz", "sepya nostaljik", "doygun canlı renkler"] },
      ],
    },
    {
      label: "HAREKET & RİTİM",
      advanced: true,
      fields: [
        { key: "hiz", label: "HIZ", placeholder: "", optional: true, options: ["normal hız", "ağır çekim", "çok ağır çekim (yüksek kare hızı)", "hızlandırılmış", "zaman atlamalı (time-lapse)"] },
        { key: "akis", label: "SAHNE İÇİ AKIŞ", placeholder: "", optional: true, options: ["tek plan, kesme yok", "arka planda hareket var, özne sabit", "özne kameraya doğru yürüyor", "kamera özneyi geride bırakıyor"] },
        { key: "detay", label: "HAREKETLİ DETAY", placeholder: "", optional: true, prefix: "sahnede", options: ["saçları rüzgârda uçuşuyor", "yapraklar havada süzülüyor", "toz zerreleri ışıkta parlıyor", "kıvılcımlar yükseliyor", "yağmur damlaları yavaşça düşüyor"] },
      ],
    },
    {
      label: "GÖRÜNTÜ DİLİ",
      advanced: true,
      fields: [
        { key: "stil", label: "GÖRÜNTÜ STİLİ", placeholder: "sinematik dijital çekim", options: ["sinematik dijital çekim", "35mm film, hafif gren", "16mm eski film", "anime", "3D animasyon (Pixar tarzı)", "stop motion", "piksel animasyon", "belgesel elde çekim"] },
        { key: "ruh", label: "RUH HALİ", placeholder: "", optional: true, options: MOOD_OPTIONS },
        { key: "referans", label: "ATMOSFER REFERANSI", placeholder: "", optional: true, prefix: "atmosferi", options: ["macera filmi", "bilim kurgu", "masal", "gizem", "spor tanıtımı", "doğa belgeseli"] },
        // Veo and Kling generate audio with the clip. Leaving this out meant
        // every video came back with whatever ambience the model guessed.
        { key: "ses", label: "SES", placeholder: "", optional: true, prefix: "ses:", options: ["sessiz", "sadece ortam sesi", "rüzgâr ve uzak uğultu", "yağmur sesi", "kalabalık uğultusu", "yükselen orkestra müziği", "kalp atışı ritmi", "diyalog yok, sadece müzik"] },
        { key: "yok", label: "OLMASIN", placeholder: "", optional: true, prefix: "olmasın:", options: ["yazı ve altyazı", "kesme ve geçiş", "kalabalık", "kameraya bakış", "bozuk eller"] },
      ],
    },
  ],
};

const animateCharacterCard: PromptCard = {
  id: "canlandir",
  name: "Karakterini canlandır",
  purpose: "Ürettiğin görselden hareket çıkar",
  source: "Hafta 8 · Karakterin canlanıyor",
  modalities: ["video"],
  groups: [
    {
      label: "HAREKET",
      hint: "Hafızayı açık bırakırsan son ürettiğin görsel ilk kare olur.",
      fields: [
        { key: "aksiyon", label: "NE YAPSIN", placeholder: "yavaşça gülümseyip el sallıyor", long: true, options: ["yavaşça gülümseyip el sallıyor", "başını çevirip kameraya bakıyor", "kameraya doğru yürüyor", "zıplayıp havada duruyor", "saçları rüzgârda dalgalanıyor"] },
        { key: "hareket", label: "KAMERA", placeholder: "hafif dolly in", options: ["sabit kamera", "hafif dolly in", "yavaş orbit", "yukarı doğru tilt", "hafif elde titreşim"] },
      ],
    },
    {
      label: "ATMOSFER",
      advanced: true,
      fields: [
        { key: "isik", label: "IŞIK", placeholder: "", optional: true, options: LIGHT_OPTIONS },
        { key: "hiz", label: "HIZ", placeholder: "", optional: true, options: ["normal hız", "ağır çekim"] },
        { key: "ses", label: "SES", placeholder: "", optional: true, prefix: "ses:", options: ["sessiz", "sadece ortam sesi", "hafif müzik"] },
        { key: "yok", label: "OLMASIN", placeholder: "karakterin görünüşü değişmesin, kıyafeti ve rengi aynı kalsın", optional: true },
      ],
    },
  ],
  build: (_v, get) =>
    [
      `Referans görseldeki karakterin aynısı: ${get("aksiyon")}`,
      `kamera: ${get("hareket")}`,
      get("isik"),
      get("hiz"),
      get("ses") && `ses: ${get("ses")}`,
      get("yok"),
    ]
      .filter(Boolean)
      .join(", "),
};

const promoCard: PromptCard = {
  id: "tanitim",
  name: "Tanıtım videosu kartı",
  purpose: "Bir ürünü ya da fikri satan kısa klip",
  source: "Hafta 16 · Kendi markam",
  modalities: ["video"],
  groups: [
    {
      label: "NE TANITILIYOR",
      fields: [
        { key: "urun", label: "ÜRÜN / FİKİR", placeholder: "el yapımı bir uzay teleskobu", long: true },
        { key: "vurgu", label: "NEYİ VURGULA", placeholder: "kolay kurulumu ve büyüleyici görüntüsü", long: true },
        { key: "sahne", label: "SAHNE", placeholder: "gece bahçede, yıldızların altında", long: true },
      ],
    },
    {
      label: "ÇEKİM",
      fields: [
        { key: "hareket", label: "KAMERA HAREKETİ", placeholder: "ürünün etrafında yavaş yörünge", options: ["ürünün etrafında yavaş yörünge", "makro detaydan geniş plana açılma", "sabit, ürün ortada", "elden ele geçiş takibi"] },
        { key: "isik", label: "IŞIK", placeholder: "stüdyo ışığı", options: LIGHT_OPTIONS },
        { key: "stil", label: "STİL", placeholder: "temiz ve modern reklam çekimi", options: ["temiz ve modern reklam çekimi", "sıcak ve samimi ev videosu", "enerjik hızlı kurgu hissi", "lüks ve sakin"] },
      ],
    },
  ],
};

// ===========================================================================
// METİN
// ===========================================================================

const roleCard: PromptCard = {
  id: "rol",
  name: "ROL + GÖREV + BAĞLAM + FORMAT",
  purpose: "Müfredatın kendi prompt formülü",
  source: "Hafta 2 · Sihirli kelimeler",
  modalities: ["text"],
  groups: [
    {
      label: "DÖRT PARÇA",
      fields: [
        { key: "rol", label: "ROL", placeholder: "Sen bir tarih öğretmenisin", long: true, options: ["Sen bir tarih öğretmenisin", "Sen deneyimli bir yazarsın", "Sen sabırlı bir matematik koçusun", "Sen bir bilim insanısın", "Sen bir oyun tasarımcısısın"] },
        { key: "gorev", label: "GÖREV", placeholder: "Bana Osmanlı'nın kuruluşunu anlat", long: true },
        { key: "baglam", label: "BAĞLAM", placeholder: "12 yaşındayım ve konuyu ilk kez duyuyorum", long: true, options: ["12 yaşındayım ve konuyu ilk kez duyuyorum", "yarın sınavım var", "bir sunum hazırlıyorum", "arkadaşıma anlatacağım"] },
        { key: "format", label: "FORMAT", placeholder: "5 maddede, her madde tek cümle", long: true, options: ["5 maddede, her madde tek cümle", "kısa bir hikâye olarak", "soru-cevap şeklinde", "tablo hâlinde", "adım adım liste"] },
      ],
    },
    {
      label: "İNCE AYAR",
      advanced: true,
      fields: [
        { key: "ton", label: "TON", placeholder: "", optional: true, prefix: "Ton:", options: ["sıcak ve cesaretlendirici", "esprili", "ciddi ve net", "meraklandırıcı"] },
        { key: "uzunluk", label: "UZUNLUK", placeholder: "", optional: true, prefix: "Uzunluk:", options: ["en fazla 5 cümle", "bir paragraf", "yarım sayfa"] },
        { key: "yok", label: "YAPMA", placeholder: "", optional: true, prefix: "Şunu yapma:", options: ["zor kelimeler kullanma", "cevabı doğrudan verme, ipucu ver", "giriş cümlesi yazma"] },
      ],
    },
  ],
  build: (_v, get) =>
    [get("rol"), get("gorev"), get("baglam"), get("format"), get("ton") && `Ton: ${get("ton")}`, get("uzunluk") && `Uzunluk: ${get("uzunluk")}`, get("yok") && `Şunu yapma: ${get("yok")}`]
      .filter(Boolean)
      .join(". ")
      .replace(/\.\./g, ".") + ".",
};

const storyCard: PromptCard = {
  id: "hikaye",
  name: "Hikâye kartı",
  purpose: "Kahramanı, sorunu ve sonu olan bir hikâye",
  source: "Yaratıcı yazarlık",
  modalities: ["text"],
  groups: [
    {
      label: "HİKÂYE",
      fields: [
        { key: "kahraman", label: "KAHRAMAN", placeholder: "12 yaşında bir astronot", long: true },
        { key: "sorun", label: "SORUN", placeholder: "uzay istasyonunda oksijen azalıyor", long: true },
        { key: "mekan", label: "MEKÂN", placeholder: "Mars yörüngesindeki bir istasyon", long: true },
        { key: "tur", label: "TÜR", placeholder: "macera", options: ["macera", "bilim kurgu", "gizem", "komedi", "masal", "korku (hafif)", "günlük hayat"] },
      ],
    },
    {
      label: "ANLATIM",
      fields: [
        { key: "uzunluk", label: "UZUNLUK", placeholder: "5 cümle", options: ["5 cümle", "bir paragraf", "üç paragraf", "bir sayfa"] },
        { key: "son", label: "SON", placeholder: "sürpriz sonlu", options: ["sürpriz sonlu", "mutlu son", "açık uçlu", "dersini alan bir son"] },
        { key: "ton", label: "TON", placeholder: "", optional: true, prefix: "tonu", options: MOOD_OPTIONS },
      ],
    },
  ],
  build: (_v, get) =>
    `${get("tur")} türünde bir hikâye yaz: kahraman ${get("kahraman")}, ${get("mekan")}, sorun ${get("sorun")}. ` +
    `${get("uzunluk")}, ${get("son")}${get("ton") ? `, tonu ${get("ton")}` : ""}.`,
};

const homeworkCard: PromptCard = {
  id: "odev",
  name: "Ödev yardımcısı",
  purpose: "Cevabı değil, anlamayı isteyen bir tarif",
  source: "Hafta 4 · Okul süper güçleri",
  modalities: ["text"],
  groups: [
    {
      label: "KONU",
      fields: [
        { key: "konu", label: "KONU", placeholder: "fotosentez", long: true },
        { key: "sinif", label: "SINIF", placeholder: "6. sınıf", options: ["4. sınıf", "5. sınıf", "6. sınıf", "7. sınıf", "8. sınıf", "lise"] },
        { key: "ne", label: "NE İSTİYORUM", placeholder: "bana anlat", options: ["bana anlat", "özetle", "10 soruluk quiz hazırla", "çalışma planı çıkar", "örneklerle açıkla", "hatalarımı bul"] },
      ],
    },
    {
      label: "NASIL",
      fields: [
        { key: "format", label: "FORMAT", placeholder: "maddeler hâlinde", options: ["maddeler hâlinde", "tablo", "kısa paragraf", "soru-cevap", "benzetmeyle"] },
        { key: "kural", label: "KURAL", placeholder: "cevabı doğrudan verme, önce ipucu ver", optional: true, options: ["cevabı doğrudan verme, önce ipucu ver", "her terimi ilk geçtiğinde açıkla", "günlük hayattan örnek ver"] },
      ],
    },
  ],
  build: (_v, get) =>
    `${get("sinif")} seviyesinde ${get("konu")} konusunu ${get("ne")}. ${get("format")} olsun.` +
    (get("kural") ? ` ${get("kural")}.` : ""),
};

// ===========================================================================
// MÜZİK & SES
// ===========================================================================

const songCard: PromptCard = {
  id: "sarki",
  name: "Şarkı kartı",
  purpose: "Türü, temposu ve enstrümanları belli bir parça",
  source: "Hafta 12 · Müzik üretimi",
  modalities: ["audio"],
  groups: [
    {
      label: "PARÇA",
      fields: [
        { key: "tur", label: "TÜR", placeholder: "enerjik pop", options: ["enerjik pop", "lo-fi hip hop", "orkestral film müziği", "akustik folk", "elektronik dans", "rock", "caz", "8-bit oyun müziği", "Anadolu rock"] },
        { key: "konu", label: "KONU", placeholder: "gece gökyüzüne bakan bir çocuk", long: true },
        { key: "ruh", label: "RUH HALİ", placeholder: "umutlu", options: MOOD_OPTIONS },
      ],
    },
    {
      label: "SES",
      fields: [
        { key: "tempo", label: "TEMPO", placeholder: "orta tempo", options: ["çok yavaş", "yavaş ve sakin", "orta tempo", "hızlı", "çok hızlı ve enerjik"] },
        { key: "enstruman", label: "ENSTRÜMANLAR", placeholder: "piyano, yaylılar, hafif davul", options: ["piyano, yaylılar, hafif davul", "akustik gitar ve el çırpma", "sentezleyici ve 808 bas", "orkestra ve koro", "arpej gitar, bas, davul", "sadece piyano"] },
        { key: "vokal", label: "VOKAL", placeholder: "enstrümantal, vokal yok", options: ["enstrümantal, vokal yok", "kadın vokal", "erkek vokal", "çocuk korosu", "mırıldanma"] },
      ],
    },
    {
      label: "YAPI",
      advanced: true,
      fields: [
        { key: "yapi", label: "BÖLÜMLER", placeholder: "", optional: true, options: ["giriş, nakarat, giriş, nakarat", "yavaş başlayıp yükselen tek bölüm", "sürekli döngü (loop)"] },
        { key: "kullanim", label: "NEREDE KULLANILACAK", placeholder: "", optional: true, prefix: "kullanım:", options: ["video fon müziği", "oyun arka planı", "jenerik", "dinlemelik"] },
      ],
    },
  ],
  build: (_v, get) =>
    [
      `${get("tur")} bir parça`,
      `konu: ${get("konu")}`,
      `ruh hali: ${get("ruh")}`,
      get("tempo"),
      `enstrümanlar: ${get("enstruman")}`,
      get("vokal"),
      get("yapi") && `yapı: ${get("yapi")}`,
      get("kullanim") && `kullanım: ${get("kullanim")}`,
    ]
      .filter(Boolean)
      .join(", "),
};

const voiceCard: PromptCard = {
  id: "seslendirme",
  name: "Seslendirme kartı",
  purpose: "Bir metni doğru tonda okutmak",
  source: "Hafta 8 · Konuşan karakter",
  modalities: ["audio"],
  groups: [
    {
      label: "METİN",
      fields: [{ key: "metin", label: "OKUNACAK METİN", placeholder: "Merhaba! Ben Nova, senin yapay zeka rehberinim.", long: true }],
    },
    {
      label: "SES",
      fields: [
        { key: "karakter", label: "SES KARAKTERİ", placeholder: "genç ve sıcak", options: ["genç ve sıcak", "yaşlı ve bilge", "enerjik sunucu", "sakin anlatıcı", "robotik", "fısıltılı"] },
        { key: "duygu", label: "DUYGU", placeholder: "neşeli", options: MOOD_OPTIONS },
        { key: "hiz", label: "HIZ", placeholder: "normal", options: ["yavaş ve net", "normal", "hızlı ve heyecanlı"] },
      ],
    },
  ],
  build: (_v, get) => `${get("karakter")} bir sesle, ${get("duygu")} bir tonda, ${get("hiz")} hızda oku: "${get("metin")}"`,
};

// ===========================================================================
// WEB & OYUN
// ===========================================================================

const siteCard: PromptCard = {
  id: "site",
  name: "Web sitesi kartı",
  purpose: "Bölümleri ve görünüşü belli, tek sayfalık bir site",
  source: "Hafta 10–11 · Vibe coding",
  modalities: ["text"],
  groups: [
    {
      label: "SİTE",
      fields: [
        { key: "amac", label: "NE İÇİN", placeholder: "kendi eserlerimi sergileyen kişisel portfolyo", long: true },
        { key: "bolumler", label: "BÖLÜMLER", placeholder: "üst başlık, hakkımda, galeri, iletişim", long: true, options: ["üst başlık, hakkımda, galeri, iletişim", "kapak, özellikler, fiyat, iletişim", "kapak, hikâye, ekip, harita"] },
        { key: "icerik", label: "İÇERİK NOTLARI", placeholder: "", optional: true, long: true },
      ],
    },
    {
      label: "GÖRÜNÜŞ",
      fields: [
        { key: "stil", label: "STİL", placeholder: "modern ve renkli", options: ["modern ve renkli", "sade ve minimal", "retro 90'lar", "karanlık mod, neon vurgular", "kâğıt ve el çizimi hissi", "oyunumsu"] },
        { key: "renk", label: "RENK", placeholder: "lacivert ve turuncu", options: ["lacivert ve turuncu", "pastel tonlar", "siyah ve neon yeşil", "krem ve kahve", "mor ve turkuaz"] },
        { key: "etkilesim", label: "ETKİLEŞİM", placeholder: "", optional: true, prefix: "etkileşim:", options: ["kaydırınca beliren animasyonlar", "üstüne gelince büyüyen kartlar", "açılır kapanır sorular", "karanlık mod düğmesi"] },
      ],
    },
  ],
  // The web tool writes code from an instruction; a comma-separated tag list
  // would land as a description of a site rather than an order to build one.
  build: (_v, get) =>
    [
      `${get("amac")} için tek sayfalık bir web sitesi yap.`,
      `Bölümler: ${get("bolumler")}.`,
      get("icerik") && `İçerik notları: ${get("icerik")}.`,
      `Stil: ${get("stil")}, renkler: ${get("renk")}.`,
      get("etkilesim") && `Etkileşim: ${get("etkilesim")}.`,
      "Mobilde de düzgün görünsün.",
    ]
      .filter(Boolean)
      .join(" "),
};

const gameCard: PromptCard = {
  id: "oyun",
  name: "Oyun kartı",
  purpose: "Tarayıcıda çalışan mini bir oyun",
  source: "Hafta 13 · Vibe coding ile oyun",
  modalities: ["text"],
  groups: [
    {
      label: "OYUN",
      fields: [
        { key: "tur", label: "TÜR", placeholder: "sonsuz koşu", options: ["sonsuz koşu", "platform zıplama", "uzay ateş etme", "yılan", "hafıza eşleştirme", "labirent", "tıklama/refleks", "bulmaca"] },
        { key: "kahraman", label: "OYUNCU", placeholder: "kendi karakterim", long: true },
        { key: "hedef", label: "HEDEF", placeholder: "engellere çarpmadan en uzağa gitmek", long: true },
        { key: "engel", label: "ENGELLER", placeholder: "gökten düşen göktaşları", long: true },
      ],
    },
    {
      label: "OYNANIŞ",
      fields: [
        { key: "kontrol", label: "KONTROL", placeholder: "boşluk tuşu ile zıpla", options: ["boşluk tuşu ile zıpla", "ok tuşlarıyla hareket", "fare ile nişan al ve tıkla", "sadece tek tuş", "dokunmatik için de çalışsın"] },
        { key: "skor", label: "SKOR", placeholder: "geçen saniye başına puan", options: ["geçen saniye başına puan", "toplanan eşya sayısı", "hayatta kalma süresi", "seviye seviye ilerleme"] },
        { key: "zorluk", label: "ZORLUK", placeholder: "", optional: true, prefix: "zorluk:", options: ["zamanla hızlanıyor", "sabit ve kolay", "üç seviye"] },
      ],
    },
    {
      label: "GÖRÜNÜŞ",
      advanced: true,
      fields: [
        { key: "stil", label: "GÖRSEL STİL", placeholder: "", optional: true, options: ["piksel-art", "sade geometrik şekiller", "neon karanlık", "el çizimi", "kâğıt kesme"] },
        { key: "ses", label: "SES", placeholder: "", optional: true, prefix: "ses:", options: ["zıplama ve puan sesleri", "sessiz"] },
      ],
    },
  ],
  build: (_v, get) =>
    [
      `Tarayıcıda çalışan bir ${get("tur")} oyunu yap.`,
      `Oyuncu: ${get("kahraman")}. Hedef: ${get("hedef")}. Engeller: ${get("engel")}.`,
      `Kontrol: ${get("kontrol")}. Skor: ${get("skor")}.`,
      get("zorluk") && `Zorluk: ${get("zorluk")}.`,
      get("stil") && `Görsel stil: ${get("stil")}.`,
      get("ses") && `Ses: ${get("ses")}.`,
      "Başlangıç ekranı ve oyun bitti ekranı olsun.",
    ]
      .filter(Boolean)
      .join(" "),
};

// ===========================================================================

export const PROMPT_CARDS: PromptCard[] = [
  // Görsel
  avatarCard,
  sceneCard,
  posterCard,
  logoCard,
  characterSheetCard,
  // Video
  cinematicCard,
  animateCharacterCard,
  promoCard,
  // Metin (site/oyun kartları da metin modelinde çalışır — web araçları metin modalitesinde)
  roleCard,
  storyCard,
  homeworkCard,
  siteCard,
  gameCard,
  // Ses
  songCard,
  voiceCard,
];

/**
 * Cards offered for a given tool.
 *
 * `web` tools are text models with a different system prompt, so the site and
 * game cards would otherwise appear next to "Hikâye kartı" in a plain chat.
 * The category id is what separates them.
 */
export function cardsFor(modality: ToolModality, categoryId?: string): PromptCard[] {
  const webOnly = new Set(["site", "oyun"]);
  return PROMPT_CARDS.filter((card) => {
    if (!card.modalities.includes(modality)) return false;
    if (categoryId === "web") return webOnly.has(card.id);
    return !webOnly.has(card.id);
  });
}
