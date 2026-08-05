/**
 * Maps the 16-week Nebula curriculum (mufredat/müfredat-v3-*.pdf, kept
 * outside the app) onto Playground tools, so the "Müfredat" browse mode can
 * show "bu haftanın yapay zekaları" instead of the flat category list.
 *
 * The two source PDFs disagree on exact model slugs (both are explicitly
 * flagged by Fatih as provisional — "yapay zekalar kesin değil") and predate
 * this catalog. Tool ids below are a thematic match to each week's real
 * lesson content (read in full from both PDFs), not a literal transcription
 * of their model names — every id here is verified to exist in tools.ts.
 */
import { FEATURED_TOOL, CATEGORIES, type PlaygroundTool } from "@/lib/playground/tools";

export interface CurriculumMonth {
  month: number;
  label: string;
}

export interface CurriculumWeek {
  week: number;
  month: number;
  title: string;
  summary: string;
  toolIds: string[];
}

export const CURRICULUM_MONTHS: CurriculumMonth[] = [
  { month: 1, label: "Ay 1 · Keşif ve Süper Güçler" },
  { month: 2, label: "Ay 2 · Yaratıcı Stüdyo" },
  { month: 3, label: "Ay 3 · Büyük Üretimler" },
  { month: 4, label: "Ay 4 · Üretici Seviye" },
];

export const CURRICULUM_WEEKS: CurriculumWeek[] = [
  {
    week: 1,
    month: 1,
    title: "Tanışma: Avatar ve Sticker Günü",
    summary: "Kendini kelimelerle tarif ederek karikatür avatarını üret, WhatsApp sticker paketine dönüştür.",
    toolIds: ["nano-banana", "flux-2-pro"],
  },
  {
    week: 2,
    month: 1,
    title: "Sihirli Kelimeler: Prompt Oyunları",
    summary: "ROL+GÖREV+BAĞLAM+FORMAT formülünü öğren, prompt düellosunda dene.",
    toolIds: ["claude-sonnet-5", "recraft-v4"],
  },
  {
    week: 3,
    month: 1,
    title: "Dedektif Günü: Gerçek mi, Yapay mı?",
    summary: "Halüsinasyonu yakala, açık kaynak modelleri karşılaştır, aileye bir rehber tasarla.",
    toolIds: ["deepseek-r1", "llama-3-3-70b"],
  },
  {
    week: 4,
    month: 1,
    title: "Araç Günü 1: Okul Süper Güçleri",
    summary: "Ders notundan podcast ve quiz üret, hızlı asistanlarla tanış.",
    toolIds: ["gpt-5-mini", "gemini-2-5-flash"],
  },
  {
    week: 5,
    month: 2,
    title: "Bilgisayar Nasıl Resim Çizer?",
    summary: "Difüzyonu keşfet, aynı sahneyi iki farklı modelde üç stilde üret.",
    toolIds: ["flux-2-pro", "seedream"],
  },
  {
    week: 6,
    month: 2,
    title: "Kendi Karakterini Yarat",
    summary: "Dönemin ana varlığı olacak özgün karakterini tasarla, karakter sayfasını oluştur.",
    toolIds: ["nano-banana", "claude-sonnet-5"],
  },
  {
    week: 7,
    month: 2,
    title: "Tasarımcı Gibi Çalış: Gerçek İş Haftası",
    summary: "Görselin içine kusursuz yazı yaz, kullanılabilir bir afiş/logo/kapak tasarla.",
    toolIds: ["recraft-v4", "gpt-image-1"],
  },
  {
    week: 8,
    month: 2,
    title: "Karakterin Canlanıyor: 3D ve Konuşan Karakter",
    summary: "Karakterini döndürülebilir 3D modele çevir, kendi replisiyle konuşturup seslendir.",
    toolIds: ["meshy-3d", "elevenlabs", "3d-avatar"],
  },
  {
    week: 9,
    month: 3,
    title: "Yapay Zeka Film Stüdyosu",
    summary: "Karakterinin 5-10 saniyelik sahnelerini üret, sinematik bir mini filme dönüştür.",
    toolIds: ["sora-2-pro", "veo-3-1-fast", "wan-2-7"],
  },
  {
    week: 10,
    month: 3,
    title: "Vibe Coding ile Web Sitesi Kuruyoruz (1/2)",
    summary: "Konuşarak kod yaz, canlı sandbox'ta ilk site taslağını yayına al.",
    toolIds: ["claude-web", "gpt-5-1-codex"],
  },
  {
    week: 11,
    month: 3,
    title: "Web Sitesi Geliştirme (2/2)",
    summary: "10 haftalık tüm eserlerini siteye entegre et, mobil uyumlu hale getirip yayınla.",
    toolIds: ["claude-web", "gpt-5-1-codex"],
  },
  {
    week: 12,
    month: 3,
    title: "Yapay Zeka Müzik Üretimi ve Dönem Finali",
    summary: "Kendi şarkını beste, filmine fon yap, veliye portfolyonu sun.",
    toolIds: ["suno", "lyria"],
  },
  {
    week: 13,
    month: 4,
    title: "Vibe Coding ile Tarayıcı Oyunu Kodlama",
    summary: "Ana karakterini kahramana çevirdiğin mini bir tarayıcı oyunu kodlat.",
    toolIds: ["kimi-k2-7-code", "glm-4-6"],
  },
  {
    week: 14,
    month: 4,
    title: "Kendi Yapay Zeka Uygulamanı Yap",
    summary: "Sistem talimatı yazarak kendi mini yapay zeka aracını üret ve yayınla.",
    toolIds: ["gpt-5-mini", "claude-sonnet-5"],
  },
  {
    week: 15,
    month: 4,
    title: "TAAFT Cep Araçları, 360° VR ve Minecraft Modding",
    summary: "Kendi sanal dünyanı ve Minecraft skin'ini oluştur.",
    toolIds: ["blockade-labs", "minecraft-skin"],
  },
  {
    week: 16,
    month: 4,
    title: "BÜYÜK FİNAL: Kendi Yapay Zeka Markam",
    summary: "4 aylık tüm eserlerini — karakter, site, şarkı, video — tek bir markada birleştir.",
    toolIds: ["claude-sonnet-5", "nano-banana", "sora-2-pro", "suno", "meshy-3d"],
  },
];

const ALL_TOOLS: PlaygroundTool[] = [FEATURED_TOOL, ...CATEGORIES.flatMap((c) => c.tools)];

export function resolveWeekTools(week: CurriculumWeek): PlaygroundTool[] {
  return week.toolIds.map((id) => ALL_TOOLS.find((t) => t.id === id)).filter((t): t is PlaygroundTool => !!t);
}

export function weeksInMonth(month: number): CurriculumWeek[] {
  return CURRICULUM_WEEKS.filter((w) => w.month === month);
}
