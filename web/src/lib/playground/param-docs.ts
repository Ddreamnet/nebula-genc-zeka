/**
 * What every studio dial does, in two registers.
 *
 * ONE dictionary, two consumers (docs/playground-studio-plan.md §4): the (i)
 * bubble next to a control, and the annotated mode of the `</>` request
 * preview. A setting is explained once, in one place, or the two surfaces
 * drift and a student reads two different stories about the same dial.
 *
 * The two registers are deliberate:
 *  - `kid` is one sentence a ten-year-old can read. Everyone sees it.
 *  - `tech` names the real parameter, its range and its default. Teachers and
 *    admins see it; a student does not, because "temperature · 0–2" is
 *    vocabulary from a different lesson.
 *  - `cost` appears only where the dial actually moves the bill, so a note
 *    that says "this costs more" still means something when it shows up.
 */
export interface ParamDoc {
  /** One sentence, kid register. Shown to every role. */
  kid: string;
  /** Real parameter name, range, default. Teacher and admin only. */
  tech?: string;
  /** One sentence, only when this dial changes what a generation costs. */
  cost?: string;
}

export const PARAM_DOCS: Record<string, ParamDoc> = {
  // ---- Text -----------------------------------------------------------
  persona: {
    kid: "Modele nasıl biri olacağını söyler: öğretmen gibi mi anlatsın, hikâye mi yazsın, kısa mı kessin.",
    tech: "system mesajının sonuna eklenen karakter talimatı · Nebula sistem promptu her zaman korunur",
  },
  systemExtra: {
    kid: "Modele en baştan verilen ek talimat — her cevapta geçerli olur.",
    tech: "system içeriğine eklenir, değiştirmez · yalnız öğretmen/admin",
  },
  temperature: {
    kid: "Düşük olursa model kurallara sıkı sıkı uyar, yüksek olursa daha çok risk alır ve şaşırtır.",
    tech: "temperature · 0–2 · varsayılan 1",
  },
  maxTokens: {
    kid: "Modelin en fazla ne kadar uzun yazabileceğini belirler. Kısa seçersen cümlesi yarıda kesilebilir.",
    tech: "max_tokens · modelin kendi tavanına kadar",
    cost: "Uzun cevap daha çok token, daha çok cevher demek.",
  },
  reasoning: {
    kid: "Model cevabı yazmadan önce kafasından geçenleri de görürsün.",
    tech: "reasoning.enabled · ayrı bir `reasoning` akışı olarak gelir",
  },
  reasoningEffort: {
    kid: "Modelin cevaptan önce ne kadar uzun düşüneceği.",
    tech: "reasoning.effort · low / medium / high",
    cost: "Uzun düşünme, faturaya yansıyan gerçek token demek.",
  },
  webSearch: {
    kid: "Model kendi bildikleriyle yetinmez, internetten güncel bilgi arar ve kaynak gösterir.",
    tech: "model slug'ının :online varyantı · OpenRouter web eklentisi",
    cost: "Her arama ayrıca ücretlendirilir; bu yüzden açıkken cevher artar.",
  },
  seed: {
    kid: "Aynı tohumu kilitlersen, aynı istekle aynı sonucu tekrar alırsın. Tek kelimeyi değiştirip farkı görmek için birebir.",
    tech: "seed · tam sayı · sağlayıcı birebir aynılığı garanti etmez",
  },
  topP: {
    kid: "Modelin kelime seçerken kaç seçeneği masada tuttuğu. Düşürürsen daha tahmin edilebilir yazar.",
    tech: "top_p · 0–1 · varsayılan 1",
  },
  topK: {
    kid: "Her adımda en olası kaç kelimeye bakacağı.",
    tech: "top_k · 0 = sınırsız",
  },
  minP: {
    kid: "Bir kelimenin masada kalabilmesi için gereken en düşük olasılık.",
    tech: "min_p · 0–1 · varsayılan 0",
  },
  verbosity: {
    kid: "Modelin ne kadar ayrıntıya gireceği.",
    tech: "verbosity · low / medium / high",
  },
  frequencyPenalty: {
    kid: "Aynı kelimeyi tekrar tekrar kullanmasını cezalandırır.",
    tech: "frequency_penalty · -2–2 · varsayılan 0",
  },
  presencePenalty: {
    kid: "Zaten geçmiş konulara dönmesini cezalandırır, yeni konulara iter.",
    tech: "presence_penalty · -2–2 · varsayılan 0",
  },
  repetitionPenalty: {
    kid: "Kendini tekrar etmesini engeller.",
    tech: "repetition_penalty · 0–2 · varsayılan 1",
  },
  stop: {
    kid: "Model bu kelimeyi yazdığı anda susar.",
    tech: "stop · virgülle ayrılmış en çok 4 dizi",
  },
  jsonMode: {
    kid: "Cevabı düz yazı yerine, programların okuyabildiği JSON biçiminde ister.",
    tech: "response_format: { type: 'json_object' }",
  },

  // ---- Image ----------------------------------------------------------
  aspectRatio: {
    kid: "Görselin dikey mi, kare mi, geniş mi olacağını seçersin. Sticker dikey, afiş geniş olur.",
    tech: "aspect_ratio · listede yalnız bu modelin kabul ettiği oranlar var",
  },
  n: {
    kid: "Aynı istekten kaç farklı sonuç üretileceği. Yan yana görüp beğendiğini seçersin.",
    tech: "n · modelin kendi tavanına ve rolüne göre sınırlı",
    cost: "Cevher, varyant sayısıyla çarpılır.",
  },
  resolution: {
    kid: "Görselin kaç piksel olacağı. Büyük seçersen detay artar, ama üretim pahalılaşır.",
    tech: "resolution · 512 / 1K / 2K / 4K (modele göre)",
    cost: "Her kademe fiyatı yaklaşık iki katına çıkarır.",
  },
  transparent: {
    kid: "Arka planı boş bırakır. Sticker ve logo için tam da bu lazım — sonradan silmene gerek kalmaz.",
    tech: "background: 'transparent' · yalnız destekleyen modellerde",
  },
  quality: {
    kid: "Modelin ne kadar uğraşacağı. Yüksek daha temiz sonuç verir ama daha yavaş ve pahalıdır.",
    tech: "quality · auto / low / medium / high",
    cost: "Yüksek kalite maliyeti belirgin artırır.",
  },
  outputFormat: {
    kid: "Görselin hangi dosya türünde geleceği.",
    tech: "output_format · modele göre png / jpeg",
  },
  outputCompression: {
    kid: "Dosyanın ne kadar sıkıştırılacağı. Düşürürsen dosya küçülür ama detay kaybolur.",
    tech: "output_compression · 0–100",
  },

  // ---- Video ----------------------------------------------------------
  duration: {
    kid: "Videonun kaç saniye olacağı.",
    tech: "duration · modelin kabul ettiği saniyeler",
    cost: "Fiyat doğrudan saniyeyle çarpılır — en pahalı kadran budur.",
  },
  videoResolution: {
    kid: "Videonun kaç piksel olacağı.",
    tech: "resolution · modele göre 480p–4K",
    cost: "Her kademe saniye fiyatını yükseltir.",
  },
  generateAudio: {
    kid: "Video kendi sesiyle mi gelsin, sessiz mi. Sessiz seçersen belirgin şekilde ucuzlar.",
    tech: "generate_audio · yalnız sesli üretebilen modellerde",
    cost: "Sesli üretim, sessizin yaklaşık 1,2–1,5 katı.",
  },
  lastFrame: {
    kid: "Videonun nerede biteceğini de sen söylersin; model arasını doldurur.",
    tech: "frame_images[last_frame] · ikinci görseli eklersin",
    cost: "Ek ücreti yok.",
  },

  // ---- Audio ----------------------------------------------------------
  voice: {
    kid: "Metni hangi sesin okuyacağı.",
    tech: "audio.voice · OpenAI ses listesi",
  },
};

/** The doc for a dial, or a safe empty one — a missing entry never crashes a panel. */
export function paramDoc(key: string): ParamDoc {
  return PARAM_DOCS[key] ?? { kid: "" };
}

/**
 * The bubble text for one dial, assembled for the reader's role.
 * A student gets the kid sentence and the cost note; staff get the parameter
 * line too.
 */
export function paramHelp(key: string, role: "admin" | "teacher" | "student"): string {
  const doc = paramDoc(key);
  const lines = [doc.kid];
  if (role !== "student" && doc.tech) lines.push(doc.tech);
  if (doc.cost) lines.push(doc.cost);
  return lines.filter(Boolean).join("\n");
}
