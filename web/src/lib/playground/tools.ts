/**
 * Playground AI catalog. Only `status: "live"` entries actually call a real
 * model right now (via OpenRouter — see `lib/ai/openrouter.ts`); everything
 * else is browsable/explained so a kid can see what's coming before it's
 * switched on. Every model slug here was verified against OpenRouter's live
 * `/api/v1/{images,videos}/models` catalog (or the general `/models` list for
 * text) before being added — never trust a slug from memory/web search alone,
 * OpenRouter's catalog changes and doesn't always match docs (see: the
 * `openai/sora-2` mixup — that slug never existed, only `sora-2-pro` does).
 * Ore pricing is calibrated to real per-generation cost: 1 image ≈ 1 "cevher"
 * is the base unit (~$0.04/image = ~1 cevher); video/text ore cost follows
 * the same $0.04/cevher ratio once real per-generation cost is known.
 *
 * Roster is intentionally wider than what's wired live: the curriculum
 * (mufredat/müfredat-v3-*.pdf) wants students to recognize 6-7 distinct,
 * real, named AI models per category — by name, model number, and logo —
 * even for categories we can't safely wire yet (no vendor API key, pricing
 * that needs a real test spend to calibrate, or a duration/format the
 * generic OpenRouter call path doesn't support). Those show as "soon" with
 * their real name and real logo, same pattern already used for Müzik.
 * Flipping one to "live" is a one-line status change once it's ready.
 */
import type { LucideIcon } from "lucide-react";
import { Box, Clapperboard, Music2, Mic2, Globe, MessageSquareText, Gamepad2, Video, Wand2, Camera, Search } from "lucide-react";

export type ToolStatus = "live" | "soon";
export type ToolModality = "text" | "image" | "video" | "audio";
export type ProviderId =
  | "anthropic"
  | "gemini"
  | "google"
  | "openai"
  | "bytedance"
  | "kuaishou"
  | "deepseek"
  | "meta"
  | "alibaba"
  | "minimax"
  | "moonshot"
  | "kimi"
  | "suno"
  | "elevenlabs"
  | "blackforest"
  | "xai"
  | "zhipu"
  | "recraft"
  | "meshy"
  | "blockade"
  | "heygen"
  | "remini"
  | "photomath"
  | "descript"
  | "udio"
  | "ideogram"
  | "runway"
  | "vercel"
  | "perplexity"
  | "krea"
  | "microsoft"
  | "amazon"
  | "mistral";

export interface PlaygroundTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: ToolStatus;
  modality: ToolModality;
  provider: ProviderId | null;
  providerModel: string;
  oreCost: number;
  /** Video only — most models default to 4s/720p; a few need an override (verified against OpenRouter's live catalog, never assumed). */
  videoDuration?: number;
  videoResolution?: string;
  /**
   * How many images a student may attach to one message. Absent/0 means the
   * model is text-only and the composer hides its attach button entirely.
   *
   * Two different mechanisms hide behind this one number, both verified live
   * against OpenRouter (never assumed — see the file header):
   *  - text tools send images as `image_url` content parts on
   *    /chat/completions; eligibility comes from the model's
   *    `architecture.input_modalities` containing "image". DeepSeek R1,
   *    Llama 3.3 70B and Qwen3 Max are text-only and stay unset.
   *  - image tools send them as `input_references` on /images (image-to-image
   *    / editing); the ceiling comes from
   *    `supported_parameters.input_references.max`.
   *
   * Several models allow far more than we expose (gpt-image-* 16, Seedream 14,
   * Gemini 3 14) — 3 is a deliberate product cap so a kid can't quietly run up
   * a 16-image bill. Where the model's own ceiling is lower than 3 it wins:
   * Recraft V4, MAI-Image and Krea 2 accept exactly 1.
   */
  maxImageInputs?: number;
}

/**
 * Extra ore per attached image, on top of the tool's base cost. Grounded in
 * measured cost at the catalog's ~$0.04/cevher ratio:
 *  - text: a 1024px image is ~1600 prompt tokens, worst case Claude Sonnet 5
 *    at $2/M ≈ $0.0032 → 0.1 cevher. (Gemini Flash is ~8x cheaper; like the
 *    flat 0.05 base cost, we don't price per-model.)
 *  - image: OpenRouter bills a flat $0.01 per input image (verified live on
 *    grok-imagine: $0.05 output + $0.01 input = $0.06) → 0.25 cevher.
 */
const IMAGE_INPUT_ORE = { text: 0.1, image: 0.25 } as const;

/**
 * Authoritative ore price for one generation. The server charges with this;
 * the client calls it too, purely so the balance gate and the composer hint
 * agree with what's about to be billed.
 */
export function generationOreCost(tool: PlaygroundTool, imageCount: number): number {
  if (imageCount <= 0) return tool.oreCost;
  const perImage = tool.modality === "image" ? IMAGE_INPUT_ORE.image : IMAGE_INPUT_ORE.text;
  return Math.round((tool.oreCost + imageCount * perImage) * 100) / 100;
}

export interface PlaygroundCategory {
  id: string;
  name: string;
  shortName: string;
  tools: PlaygroundTool[];
}

export const FEATURED_TOOL: PlaygroundTool = {
  id: "claude-haiku",
  name: "Claude Haiku 4.5",
  description: "Sohbet eder, hikaye yazar, sorularını yanıtlar — meraklı ve sıcak bir yazı arkadaşı.",
  icon: MessageSquareText,
  status: "live",
  modality: "text",
  provider: "anthropic",
  providerModel: "anthropic/claude-haiku-4.5",
  oreCost: 0.05,
  maxImageInputs: 3,
};

export const CATEGORIES: PlaygroundCategory[] = [
  {
    id: "metin",
    name: "Metin & Sohbet",
    shortName: "Metin",
    tools: [
      {
        id: "claude-sonnet-5",
        name: "Claude Sonnet 5",
        description: "Anthropic'in derin düşünen modeli — karmaşık akıl yürütme, uzun metin ve sistem talimatlarında güçlü.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "anthropic",
        providerModel: "anthropic/claude-sonnet-5",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
      {
        id: "gpt-5-mini",
        name: "GPT-5 Mini",
        description: "OpenAI'ın hızlı ve akıllı sohbet modeli — anında yanıt ister misin, o iş.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "openai",
        providerModel: "openai/gpt-5-mini",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
      {
        id: "gemini-2-5-flash",
        name: "Gemini 2.5 Flash",
        description: "Google'ın hızlı diyalog modeli — soru-cevap ve günlük sohbet için pratik.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "gemini",
        providerModel: "google/gemini-2.5-flash",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
      {
        id: "deepseek-r1",
        name: "DeepSeek R1",
        description: "Açık kaynak bir akıl yürütme modeli — adım adım düşünerek zor problemleri çözer.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "deepseek",
        providerModel: "deepseek/deepseek-r1",
        oreCost: 0.05,
      },
      {
        id: "llama-3-3-70b",
        name: "Llama 3.3 70B",
        description: "Meta'nın açık kaynak modeli — herkese açık, dünyanın dört bir yanında araştırmacılar kullanıyor.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "meta",
        providerModel: "meta-llama/llama-3.3-70b-instruct",
        oreCost: 0.05,
      },
      {
        id: "qwen3-max",
        name: "Qwen3 Max",
        description: "Alibaba'nın açık kaynak aile modeli — çok dilli sohbette ve genel bilgide güçlü.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "alibaba",
        providerModel: "qwen/qwen3-max",
        oreCost: 0.05,
      },
      {
        id: "grok-4-5",
        name: "Grok 4.5",
        description: "xAI'ın (Elon Musk) sohbet modeli — esprili, doğrudan ve filtre takmadan konuşan bir kişiliği var.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "xai",
        providerModel: "x-ai/grok-4.5",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
      {
        id: "nova-pro",
        name: "Amazon Nova Pro",
        description: "Amazon'un sohbet modeli — hızlı, çok dilli ve günlük görevlerde pratik bir seçenek.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "amazon",
        providerModel: "amazon/nova-pro-v1",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
      {
        id: "mistral-large",
        name: "Mistral Large",
        description: "Fransız Mistral AI'ın amiral gemisi modeli — Avrupa'nın önde gelen açık kaynak laboratuvarlarından.",
        icon: MessageSquareText,
        status: "live",
        modality: "text",
        provider: "mistral",
        providerModel: "mistralai/mistral-large-2512",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
      {
        id: "perplexity-sonar",
        name: "Perplexity Sonar",
        description: "Sohbet etmez — gerçek zamanlı internet araması yapıp kaynak gösterir, sorularına güncel ve doğrulanmış cevaplar bulur.",
        icon: Search,
        status: "live",
        modality: "text",
        provider: "perplexity",
        providerModel: "perplexity/sonar",
        oreCost: 0.05,
        maxImageInputs: 3,
      },
    ],
  },
  {
    id: "gorsel",
    name: "Görsel, Afiş & 3D",
    shortName: "Görsel",
    tools: [
      {
        id: "nano-banana",
        name: "Nano Banana",
        description: "Google'ın hızlı görsel modeli — canlı renkler, karikatür ve fantastik sahneler için harika.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "gemini",
        providerModel: "google/gemini-2.5-flash-image",
        oreCost: 1,
        maxImageInputs: 3,
      },
      {
        id: "gpt-image-1",
        name: "GPT Image 1",
        description: "OpenAI'ın görsel modeli — temiz çizgiler ve yazı/metin içeren görsellerde çok başarılı.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "openai",
        providerModel: "openai/gpt-image-1",
        oreCost: 1,
        maxImageInputs: 3,
      },
      {
        id: "seedream",
        name: "Seedream 4.5",
        description: "ByteDance'ın görsel modeli — detaylı düzenlemede ve karakter tutarlılığında güçlü.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "bytedance",
        providerModel: "bytedance-seed/seedream-4.5",
        oreCost: 1,
        maxImageInputs: 3,
      },
      {
        id: "flux-2-pro",
        name: "FLUX.2 Pro",
        description: "Black Forest Labs'ın amiral gemisi görsel modeli — keskin ışık ve doku, güçlü prompt takibi.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "blackforest",
        providerModel: "black-forest-labs/flux.2-pro",
        oreCost: 1,
        maxImageInputs: 3,
      },
      {
        id: "recraft-v4",
        name: "Recraft V4",
        description: "Vektör çizim ve logo/afiş konusunda uzman — görselin içine kusursuz yazı yazabilen nadir modellerden.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "recraft",
        providerModel: "recraft/recraft-v4",
        oreCost: 1,
        maxImageInputs: 1,
      },
      {
        id: "grok-imagine-image",
        name: "Grok Imagine",
        description: "xAI'ın görsel modeli — hızlı ve fotogerçekçi, referans görselle düzenlemeyi de destekler.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "xai",
        providerModel: "x-ai/grok-imagine-image-quality",
        oreCost: 1,
        maxImageInputs: 3,
      },
      {
        id: "nano-banana-2",
        name: "Nano Banana 2",
        description: "Google'ın yeni nesil görsel modeli — Nano Banana'nın daha güçlü hali, Pro kalitesini Flash hızında sunar.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "gemini",
        providerModel: "google/gemini-3.1-flash-image",
        oreCost: 2,
        maxImageInputs: 3,
      },
      {
        id: "gpt-image-2",
        name: "GPT Image 2",
        description: "OpenAI'ın yeni nesil görsel modeli — GPT Image 1'in daha hızlı ve daha ucuz hali.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "openai",
        providerModel: "openai/gpt-image-2",
        oreCost: 1,
        maxImageInputs: 3,
      },
      {
        id: "nano-banana-pro",
        name: "Nano Banana Pro",
        description: "Nano Banana'nın en güçlü hali — Google'ın amiral gemisi görsel modeli, daha keskin detay ve daha iyi ışıklandırma.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "gemini",
        providerModel: "google/gemini-3-pro-image",
        oreCost: 3,
        maxImageInputs: 3,
      },
      {
        id: "microsoft-mai-image",
        name: "Microsoft MAI-Image",
        description: "Microsoft'un kendi görsel modeli — dengeli kompozisyon ve gerçekçi sahneler için güçlü bir seçenek.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "microsoft",
        providerModel: "microsoft/mai-image-2.5-pro",
        oreCost: 3,
        maxImageInputs: 1,
      },
      {
        id: "krea-2",
        name: "Krea 2",
        description: "Genç yaratıcı topluluklarında çok popüler bir marka — hızlı, gerçekçi ve doku odaklı bir estetik sunar.",
        icon: Box,
        status: "live",
        modality: "image",
        provider: "krea",
        providerModel: "krea/krea-2-large",
        oreCost: 2,
        maxImageInputs: 1,
      },
      {
        id: "ideogram",
        name: "Ideogram",
        description: "Görselin içine kusursuz yazı yazabilen modelleriyle tanınır — logo, afiş ve kapak tasarımında güçlü.",
        icon: Box,
        status: "soon",
        modality: "image",
        provider: "ideogram",
        providerModel: "",
        oreCost: 0,
      },
    ],
  },
  {
    id: "video",
    name: "Video",
    shortName: "Video",
    tools: [
      {
        id: "sora-2-pro",
        name: "Sora 2 Pro",
        description: "OpenAI'ın en gelişmiş video modeli — en sinematik ve gerçekçi sonuçlar, biraz daha pahalı.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "openai",
        providerModel: "openai/sora-2-pro",
        oreCost: 30,
      },
      {
        id: "veo-3-1-fast",
        name: "Veo 3.1 Fast",
        description: "Google'ın hızlı video modeli — sesli sahneler üretir, kaliteyle hız arasında iyi bir denge.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "google",
        providerModel: "google/veo-3.1-fast",
        oreCost: 10,
      },
      {
        id: "kling-3-std",
        name: "Kling 3.0 Standard",
        description: "Kuaishou'nun video modeli — en uygun fiyatlı seçenek, hareketli sahneler için gayet iyi.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "kuaishou",
        providerModel: "kwaivgi/kling-v3.0-std",
        oreCost: 9,
      },
      {
        id: "wan-2-7",
        name: "Wan 2.7",
        description: "Alibaba'nın açık video modeli — akıcı hareket ve tutarlı sahneler.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "alibaba",
        providerModel: "alibaba/wan-2.7",
        oreCost: 10,
      },
      {
        id: "grok-imagine-video",
        name: "Grok Imagine Video",
        description: "xAI'ın video modeli — metinden hızlı ve enerjik kısa sahneler üretir.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "xai",
        providerModel: "x-ai/grok-imagine-video",
        oreCost: 7,
      },
      {
        id: "hailuo-2-3",
        name: "MiniMax Hailuo 2.3",
        description: "MiniMax'ın video modeli — 6 saniyelik daha uzun sahnelerde güçlü.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "minimax",
        providerModel: "minimax/hailuo-2.3",
        oreCost: 12,
        videoDuration: 6,
        videoResolution: "1080p",
      },
      {
        id: "seedance-2",
        name: "Seedance 2.0",
        description: "ByteDance'ın video modeli — Seedream'in video ailesi, akıcı kamera hareketleriyle tanınıyor.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "bytedance",
        providerModel: "bytedance/seedance-2.0",
        oreCost: 15,
      },
      {
        id: "happyhorse",
        name: "HappyHorse 1.1",
        description: "Alibaba'nın video modeli — eğlenceli ismiyle tanınır, 3 ile 15 saniye arası istediğin uzunlukta sahne üretebilir.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "alibaba",
        providerModel: "alibaba/happyhorse-1.1",
        oreCost: 12,
      },
      {
        id: "veo-3-1-lite",
        name: "Veo 3.1 Lite",
        description: "Veo 3.1 Fast'ın bütçe dostu kardeşi — sesli sahneler üretmeye devam eder, video araçlarının en uygun fiyatlısı.",
        icon: Clapperboard,
        status: "live",
        modality: "video",
        provider: "google",
        providerModel: "google/veo-3.1-lite",
        oreCost: 5,
      },
      {
        id: "runway",
        name: "Runway",
        description: "Sinematik video üretiminin öncülerinden — metinden ve görselden kısa film sahneleri üretir.",
        icon: Clapperboard,
        status: "soon",
        modality: "video",
        provider: "runway",
        providerModel: "",
        oreCost: 0,
      },
    ],
  },
  {
    id: "muzik",
    name: "Müzik & Ses",
    shortName: "Müzik",
    tools: [
      {
        id: "lyria",
        name: "Google Lyria",
        description: "Google'ın müzik üretim modeli — yazdığın sözlerden ya da fikirden bir melodi besteler.",
        icon: Music2,
        status: "live",
        modality: "audio",
        provider: "google",
        providerModel: "google/lyria-3-pro-preview",
        oreCost: 2,
      },
      {
        id: "gpt-audio",
        name: "OpenAI GPT Audio",
        description: "OpenAI'ın ses modeli — yazdığın metni gerçekçi bir sesle okur, ses efekti de üretebilir.",
        icon: Mic2,
        status: "live",
        modality: "audio",
        provider: "openai",
        providerModel: "openai/gpt-audio",
        oreCost: 0.1,
      },
      {
        id: "gpt-audio-mini",
        name: "OpenAI GPT Audio Mini",
        description: "GPT Audio'nun daha küçük ve hızlı hali — kısa sesli notlar için ideal.",
        icon: Mic2,
        status: "live",
        modality: "audio",
        provider: "openai",
        providerModel: "openai/gpt-audio-mini",
        oreCost: 0.05,
      },
      {
        id: "lyria-clip",
        name: "Google Lyria Clip",
        description: "Lyria'nın kısa klip modu — hızlı fon müziği ve jingle üretimi için.",
        icon: Music2,
        status: "live",
        modality: "audio",
        provider: "google",
        providerModel: "google/lyria-3-clip-preview",
        oreCost: 1,
      },
      {
        id: "elevenlabs",
        name: "ElevenLabs",
        description: "Ses klonlama ve karakter seslendirmesinde dünyanın en bilinen markası — konuşan avatarların sesi burada.",
        icon: Mic2,
        status: "soon",
        modality: "audio",
        provider: "elevenlabs",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "suno",
        name: "Suno",
        description: "Yazdığın şarkı sözünü gerçek bir şarkıya dönüştürür — pop, rock, lo-fi, hangi tarzı istersen.",
        icon: Music2,
        status: "soon",
        modality: "audio",
        provider: "suno",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "udio",
        name: "Udio",
        description: "Suno'nun en bilinen rakibi — birkaç cümleyle stüdyo kalitesinde bir şarkı besteler.",
        icon: Music2,
        status: "soon",
        modality: "audio",
        provider: "udio",
        providerModel: "",
        oreCost: 0,
      },
    ],
  },
  {
    id: "web",
    name: "Web, Oyun & Kod",
    shortName: "Web",
    tools: [
      {
        id: "claude-web",
        name: "Claude Sonnet 5",
        description: "Tarif ettiğin siteyi, oyunu ya da arayüzü tek seferde çalışan bir sayfaya dönüştürür.",
        icon: Globe,
        status: "live",
        modality: "text",
        provider: "anthropic",
        providerModel: "anthropic/claude-sonnet-5",
        oreCost: 0.05,
      },
      {
        id: "gpt-5-1-codex",
        name: "GPT-5.1 Codex",
        description: "OpenAI'ın kodlamaya özel modeli — büyük siteleri ve oyunları adım adım kurar.",
        icon: Globe,
        status: "live",
        modality: "text",
        provider: "openai",
        providerModel: "openai/gpt-5.1-codex",
        oreCost: 0.05,
      },
      {
        id: "qwen3-coder-plus",
        name: "Qwen3 Coder Plus",
        description: "Alibaba'nın kodlama modeli — açık kaynak dünyasının en hızlı kod yazarlarından.",
        icon: Globe,
        status: "live",
        modality: "text",
        provider: "alibaba",
        providerModel: "qwen/qwen3-coder-plus",
        oreCost: 0.05,
      },
      {
        id: "deepseek-v3-2",
        name: "DeepSeek V3.2",
        description: "DeepSeek'in genel amaçlı modeli — mantık kurma ve kod yazmada güçlü, tamamen açık kaynak felsefesiyle.",
        icon: Globe,
        status: "live",
        modality: "text",
        provider: "deepseek",
        providerModel: "deepseek/deepseek-v3.2",
        oreCost: 0.05,
      },
      {
        id: "kimi-k2-7-code",
        name: "Kimi K2.7 Code",
        description: "Moonshot AI'ın kodlamaya özel modeli — uzun projelerde bağlamı unutmadan çalışır.",
        icon: Globe,
        status: "live",
        modality: "text",
        provider: "kimi",
        providerModel: "moonshotai/kimi-k2.7-code",
        oreCost: 0.05,
      },
      {
        id: "glm-4-6",
        name: "GLM 4.6",
        description: "Z.ai'ın (Zhipu) modeli — Çin'in önde gelen açık kaynak laboratuvarlarından biri.",
        icon: Globe,
        status: "live",
        modality: "text",
        provider: "zhipu",
        providerModel: "z-ai/glm-4.6",
        oreCost: 0.05,
      },
      {
        id: "v0-vercel",
        name: "v0 by Vercel",
        description: "Tarif ettiğin siteyi anında gerçek, çalışan bir web sayfasına dönüştürür.",
        icon: Globe,
        status: "soon",
        modality: "text",
        provider: "vercel",
        providerModel: "",
        oreCost: 0,
      },
    ],
  },
  {
    id: "diger",
    name: "Diğerleri",
    shortName: "Diğerleri",
    tools: [
      {
        id: "3d-avatar",
        name: "Konuşan 3D Avatar",
        description: "Kendi karakterini tasarla; sesi ve hareketiyle ekranda canlansın — hangi sağlayıcı olacağı henüz kararlaştırılmadı.",
        icon: Box,
        status: "soon",
        modality: "video",
        provider: null,
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "meshy-3d",
        name: "Meshy",
        description: "Çizdiğin veya ürettiğin 2D karakteri döndürülebilir bir 3D modele dönüştürür.",
        icon: Box,
        status: "soon",
        modality: "image",
        provider: "meshy",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "blockade-labs",
        name: "Blockade Labs",
        description: "Tek bir cümleden 360° gezilebilir sanal bir dünya üretir — VR gözlük hissi veren bir arayüzde.",
        icon: Globe,
        status: "soon",
        modality: "image",
        provider: "blockade",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "minecraft-skin",
        name: "Minecraft Skin Üretici",
        description: "Hayalindeki karakteri tarif et, indirilebilir bir Minecraft skin dosyası olarak al.",
        icon: Gamepad2,
        status: "soon",
        modality: "image",
        provider: null,
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "heygen",
        name: "HeyGen",
        description: "Yazdığın metni gerçek bir insan gibi konuşan bir dijital sunucuya dönüştürür — sunum ve tanıtım videoları için.",
        icon: Video,
        status: "soon",
        modality: "video",
        provider: "heygen",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "remini",
        name: "Remini",
        description: "Eski, bulanık veya düşük kaliteli aile fotoğraflarını yapay zekayla netleştirir, canlandırır.",
        icon: Wand2,
        status: "soon",
        modality: "image",
        provider: "remini",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "photomath",
        name: "Photomath",
        description: "Telefonun kamerasıyla bir matematik sorusunu göster, yapay zeka adım adım çözsün.",
        icon: Camera,
        status: "soon",
        modality: "image",
        provider: "photomath",
        providerModel: "",
        oreCost: 0,
      },
      {
        id: "descript",
        name: "Descript",
        description: "Podcast ve videolarındaki 'ııı'ları otomatik temizler, sesini yazıyla düzenlemeni sağlar.",
        icon: Mic2,
        status: "soon",
        modality: "audio",
        provider: "descript",
        providerModel: "",
        oreCost: 0,
      },
    ],
  },
];

export function findTool(toolId: string): { tool: PlaygroundTool; category: PlaygroundCategory | null } | null {
  if (toolId === FEATURED_TOOL.id) return { tool: FEATURED_TOOL, category: null };
  for (const category of CATEGORIES) {
    const tool = category.tools.find((t) => t.id === toolId);
    if (tool) return { tool, category };
  }
  return null;
}
