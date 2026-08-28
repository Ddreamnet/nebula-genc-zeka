/**
 * The six outputs — the bento cards on the homepage and the page behind each
 * one under /eserler.
 *
 * Card copy and page copy live in the same record on purpose. The section's
 * claim is "altı somut çıktı"; a card that opens a page making a second,
 * differently-worded promise undoes that claim. The page has one job instead:
 * show the work students actually handed in for that output.
 *
 * `works` is the only part that changes often — a new piece is one entry plus
 * two files under /public/eserler. Categories with an empty list render an
 * honest "ilk işler yolda" state rather than a placeholder grid, because a
 * fake sample here would be the one thing this page exists to disprove.
 */

export type StudentWork = {
  /** Stable key; also the anchor if we ever deep-link a single piece. */
  slug: string;
  title: string;
  /** First name only — a child's surname never goes into site copy. */
  student: string;
  /** One line, in the terms the student would use. */
  note: string;
  image: { src: string; width: number; height: number; alt: string };
  /**
   * Optional still from the lesson the piece was made in. Faces are blurred
   * before the file is committed; the caption says so, because a parent
   * reading this page is asking exactly that question.
   */
  lesson?: { src: string; width: number; height: number; alt: string };
};

export type OutputCategory = {
  slug: string;
  /** "ÇIKTI 01" — the eyebrow shared by the card and the page. */
  no: string;
  /** Card heading. */
  title: string;
  /** Page heading: the same thing, said from the visitor's side. */
  pageTitle: string;
  /** One line on the card. */
  desc: string;
  /** One paragraph at the top of the page. */
  lead: string;
  /** Bento column span — layout, but it belongs with the card's identity. */
  span: string;
  /** Panel tint behind the art. */
  panel: string;
  /** Accent used for the hard shadow, the eyebrow and the card's ink. */
  tone: string;
  works: StudentWork[];
};

export const OUTPUT_CATEGORIES: OutputCategory[] = [
  {
    slug: "web-sitesi",
    no: "ÇIKTI 01",
    title: "Kendi web sitesi",
    pageTitle: "Öğrencilerin siteleri",
    desc: "Aklındaki fikri anlatıyor, sitesi çıkıyor. Sonra linki sınıf grubuna atıyor.",
    lead: "Fikri öğrenci anlatıyor, sayfayı birlikte kuruyoruz. Ders bittiğinde ortada açılıp gezilebilen, linki paylaşılabilen bir site oluyor.",
    span: "span-4",
    panel: "#DCD2FF",
    tone: "var(--violet-deep)",
    works: [],
  },
  {
    slug: "avatar",
    no: "ÇIKTI 02",
    title: "Konuşan 3D avatar",
    pageTitle: "Öğrencilerin karakterleri",
    desc: "Karakteri o çiziyor, sesi o veriyor. Karakter ekranda konuşuyor.",
    lead: "Karakteri öğrenci tasarlıyor, sesini kendi yazdığı metinden veriyor. Sonunda ekranda konuşan, kendi karakteri oluyor.",
    span: "span-2",
    panel: "#C6F1DC",
    tone: "var(--mint-deep)",
    works: [],
  },
  {
    slug: "oyun",
    no: "ÇIKTI 03",
    title: "Oyun",
    pageTitle: "Öğrencilerin oyunları",
    desc: "Kuralları o koyuyor. Sonunda arkadaşı oturup oynuyor.",
    lead: "Kuralı, sahnesi, zorluğu öğrencinin kendi kararı. Ders sonunda arkadaşının oturup oynayabileceği bir oyun çıkıyor.",
    span: "span-2",
    panel: "#FFD6DE",
    tone: "var(--coral-deep)",
    works: [],
  },
  {
    slug: "afis",
    no: "ÇIKTI 04",
    title: "Afiş & görsel",
    pageTitle: "Öğrencilerin afişleri ve görselleri",
    desc: "Odasına asacak kalitede afişler. Baskıya hazır çıkıyor.",
    lead: "Afiş, kapak, poster. Öğrenci ne anlatmak istediğine karar veriyor; çıkan dosya baskıya hazır oluyor.",
    span: "span-2",
    panel: "#FFE1C4",
    tone: "var(--amber-deep)",
    works: [
      {
        slug: "yagmur-ormani",
        title: "Yağmur Ormanı — kitap kapağı",
        student: "Yamaç",
        note: "Kendi yazdığı hikâyenin kapağını tasarladı: ormanı, hayvanları ve şelaleyi tek tek anlatarak çıkardı.",
        image: {
          src: "/eserler/yagmur-ormani.jpg",
          width: 596,
          height: 896,
          alt: "Yamaç'ın tasarladığı Yağmur Ormanı kitap kapağı: yağmur ormanında jaguar, tukan, maymunlar ve bir şelale.",
        },
        lesson: {
          src: "/eserler/yagmur-ormani-ders.jpg",
          width: 562,
          height: 144,
          alt: "Kapağın yapıldığı canlı dersten bir kare; öğretmen ve öğrencinin yüzleri bulanıklaştırılmış.",
        },
      },
    ],
  },
  {
    slug: "muzik",
    no: "ÇIKTI 05",
    title: "Müzik & şarkı",
    pageTitle: "Öğrencilerin şarkıları",
    desc: "Sözü onun, melodisi onun. Telefonda çalınabilecek bir parça.",
    lead: "Sözü öğrenci yazıyor, melodiyi birlikte kuruyoruz. Sonunda telefonuna atıp dinletebileceği bir parça oluyor.",
    span: "span-2",
    panel: "#D3DCFB",
    tone: "var(--blue-deep)",
    works: [],
  },
  {
    slug: "video",
    no: "ÇIKTI 06",
    title: "Video & kısa film",
    pageTitle: "Öğrencilerin videoları",
    desc: "Senaryodan kurguya kadar hepsi onun. Sonunda izlenecek bir kısa film.",
    lead: "Senaryo, sahneler, kurgu — sırayla öğrencinin kararı. Ders bittiğinde baştan sona izlenebilen bir kısa film çıkıyor.",
    span: "span-6",
    panel: "#FFEBCF",
    tone: "var(--amber-deep)",
    works: [],
  },
];

export function findOutputCategory(slug: string): OutputCategory | undefined {
  return OUTPUT_CATEGORIES.find((c) => c.slug === slug);
}
