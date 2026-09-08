# Playground Stüdyo — Uygulama Planı

**Tarih:** 7 Eylül 2026
**Durum:** Karar verildi. 7 Eylül akşamı tasarım geldi ve arayüz kabuğu + Paket A/1, A/3 uygulandı (bkz. §15); Paket B ve sonrası sırada.
**Kapsam:** Playground'daki yapay zeka araçlarına stüdyo seviyesinde girdi kontrolü kazandırmak, model/kategori sayısını genişletmek, kontrolleri role göre ayırmak.

**Bu dosya kime yazıldı:** Bu işi devralacak oturuma. Soğuktan başlayan biri için yeterli olacak şekilde yazıldı — mevcut kod haritası, canlı doğrulanmış API verileri, ürün kararları, güvenlik kilitleri ve paket sırası burada. Katalog verileri 7 Eylül 2026'da OpenRouter'ın canlı uçlarından çekildi, hafızadan yazılmadı.

---

## 0. Değişmeyecek kurallar

Bu plandaki her madde bu dört kısıta göre tasarlandı. Uygulayan kişi bunları bozmasın:

1. **Sohbet geçmişi şemasına dokunulmaz.** `playground_chats`, `playground_chat_messages`, `rpc_append_turn`, `rpc_settle_message`, `GET/DELETE /api/playground/chats` aynen kalır. Tek şema değişikliği: `ai_generations` tablosuna `params jsonb` sütunu (bkz. §8).
2. **Slug ve parametre hafızadan yazılmaz.** `lib/playground/tools.ts` başındaki uyarı geçerli: her model slug'ı ve her parametre, OpenRouter'ın canlı kataloğundan doğrulanır. Bu planın kendisi de öyle yazıldı.
3. **Cevher, üretimden önce düşülür; başarısızlıkta iade edilir.** `rpc_start_generation` / `rpc_finalize_generation` akışı korunur. Stüdyo, bu akışa yeni parametreler ekler; akışı değiştirmez.
4. **Model çıktısı çalıştıran her yer sandbox'ta kalır.** `web` kategorisinin `sandbox="allow-scripts"` iframe'i (allow-same-origin yok) aynen sürer.

---

## 1. Bugünün haritası

Devralan kişinin okuması gereken dosyalar ve şu an ne yaptıkları:

| Dosya | Rolü | Stüdyo bunun neresine dokunuyor |
|---|---|---|
| `web/src/lib/playground/tools.ts` (849 satır) | Araç kataloğu: id, ad, sağlayıcı, `providerModel`, `oreCost`, `maxImageInputs`, `videoDuration`, `videoResolution`, `reasoning` | Her araca `capabilities` ve `pricing` alanı eklenecek; `oreCost` sabiti formüle dönüşecek |
| `web/src/lib/ai/openrouter.ts` | `streamText`, `generateImage`, `startVideo`, `pollVideo`, `downloadVideo`, `generateAudio` | Hepsi parametre nesnesi alacak; ayrıca `/audio/speech` ve `/audio/transcriptions` için iki yeni fonksiyon |
| `web/src/app/api/playground/generate/route.ts` | Doğrulama, cevher kapısı, transkript, model çağrısı | Parametreleri doğrulayacak, role göre kısıtlayacak, `params` olarak kaydedecek |
| `web/src/components/playground/playground.tsx` (2757 satır) | Composer, Hafıza anahtarı, `AspectPicker`, `CompareSwitch`, `ComparePicker` | Yeni `StudioPanel` ve `PayloadInspector` bileşenleri; kontrol satırı yeniden düzenlenecek |
| `web/src/lib/playground/aspect.ts` | 4 sabit en-boy oranı | Modelin desteklediği oranlardan türeyecek |
| `web/src/lib/playground/prompt-cards.ts` (784 satır) | Tarif kartları, `advanced: true` deseni | Stüdyo paneli aynı iki katmanlı aç/kapa desenini kullanacak |
| `web/src/lib/playground/cutout.ts` | Kenar flood-fill ile arka plan silme | `background: transparent` destekleyen modellerde devre dışı kalacak |
| `web/src/components/playground/lesson-tools.tsx` | Tarif kartları + sınıf turları | "Aynı tohumla merdiven" turu buraya eklenecek |

**Bugün gönderdiğimiz parametreler:**

- Metin: `model`, `messages`, `stream`, `stream_options`, `reasoning` (yalnız 2 araçta)
- Görsel: `model`, `prompt`, `n: 1`, `aspect_ratio` (4 sabit seçenek), `input_references`
- Video: `model`, `prompt`, `duration` (araca gömülü sabit), `resolution` (sabit), `frame_images[first_frame]`
- Ses: `chat/completions` + `modalities: ["text","audio"]` + `voice: "alloy"` **sabit**

**Kaçırdığımız yüzey:** görselde 12 parametrenin 10'u, videoda 9'un 6'sı, seste endpoint'in tamamı, metinde 20+ parametrenin neredeyse hepsi.

---

## 2. Canlı doğrulanmış API yüzeyi

Aşağıdaki tabloların hepsi 7 Eylül 2026'da `openrouter.ai/api/v1` üzerinden çekildi. Uygulamadan önce yeniden çekilmeli (§9'daki senkron script'i tam olarak bunun için).

### 2.1 Metin — `POST /chat/completions`

430 model. Parametre destek sayıları: `max_tokens` 419, `response_format` 370, `tools` 363, `tool_choice` 355, `temperature` 345, `structured_outputs` 344, `top_p` 327, `seed` 326, `include_reasoning` 303, `reasoning` 303, `stop` 299, `frequency_penalty` 233, `presence_penalty` 225, `top_k` 213, `reasoning_effort` 160, `repetition_penalty` 151, `logprobs` 147, `top_logprobs` 147, `logit_bias` 142, `min_p` 115, `verbosity` 21, `web_search_options` 17.

Ayrıca: `:online` model varyantı ve web arama eklentisi her modele gerçek zamanlı internet erişimi veriyor (Perplexity'ye özel değil).

### 2.2 Görsel — `POST /images`

52 model. İstek gövdesi: `model`, `prompt`, `n` (1–10), `resolution` (`512`/`1K`/`2K`/`4K`), `aspect_ratio`, `size` (birebir piksel), `quality` (`auto`/`low`/`medium`/`high`), `output_format` (`png`/`jpeg`/`webp`/`svg`), `background` (`auto`/`transparent`/`opaque`), `output_compression` (0–100), `seed`, `stream`, `input_references`, `user`, `provider.{only,order,ignore,sort,allow_fallbacks,options}`.

Kullandığımız modellerin yetenekleri:

| Model | Çözünürlük | Oran sayısı | `n` | Referans | Tohum | Şeffaf | Format | Geçiş parametreleri |
|---|---|---|---|---|---|---|---|---|
| `google/gemini-2.5-flash-image` (Nano Banana) | – | 10 | 1 | 3 | – | – | – | – |
| `google/gemini-3.1-flash-image` (NB 2) | 512/1K/2K/4K | 14 | 1 | 14 | – | – | – | – |
| `google/gemini-3-pro-image` (NB Pro) | 1K/2K/4K | 10 | 1 | 14 | – | – | – | `cachedContent` |
| `openai/gpt-image-1` | – | 4 | 10 | 16 | – | **✔** | – | `moderation` |
| `openai/gpt-image-2` | – | 9 | 10 | 16 | – | – (opaque) | – | `moderation` |
| `bytedance-seed/seedream-4.5` | 1K/2K/4K | 18 | 10 | 14 | ✔ | – | – | – |
| `black-forest-labs/flux.2-pro` | – | 9 | 1 | 8 | ✔ | – | png/jpeg | **`steps`, `guidance`**, `safety_tolerance` |
| `recraft/recraft-v4` | – | 6 | 6 | 1 | – | – | – | – |
| `recraft/recraft-v4-styles` | – | 12 | 6 | 10 | – | – | – | **`style_id`, `style_match`, `controls`, `random_seed`** |
| `recraft/recraft-v4.1-vector` | – | 6 | 6 | 1 | – | – | **svg** | – |
| `x-ai/grok-imagine-image-quality` | 1K/2K | 13 | 1 | 3 | – | – | – | – |
| `microsoft/mai-image-2.5-pro` | – | 8 | 1 | 1 | – | – | – | – |
| `krea/krea-2-large` | 1K | 7 | – | 1 | ✔ | – | – | – |
| `sourceful/riverflow-v2.5-pro` | 1K/2K/4K | 9 | 1 | 10 | – | **✔** | png/jpeg/webp | – |

Üç sonuç: **`background: transparent`** sticker dersinin arka plan problemini modelin kendisine çözdürüyor; **`output_format: svg`** logo dersine baskıya girebilir vektör çıktı veriyor; **`seed`** müfredatın "merdiven" mantığını bilimsel hale getiriyor.

### 2.3 Video — `POST /videos`

28 model. İstek gövdesi: `model`, `prompt`, `duration`, `resolution`, `aspect_ratio`, `size`, `frame_images` (first/last), `input_references`, `generate_audio`, `seed`, `callback_url`, `provider`.

| Model | Süre (sn) | Çözünürlük | Oranlar | Kare | Ses | Tohum | Geçiş parametreleri | Fiyat |
|---|---|---|---|---|---|---|---|---|
| `openai/sora-2-pro` | 4/8/12/16/20 | 720p, 1080p | 16:9, 9:16 | – | ✔ | – | `quality`, `style` | 0,30 / 0,50 $ per sn |
| `google/veo-3.1` | 4/6/8 | 720p–4K | 16:9, 9:16 | ilk+son | ✔ | ✔ | `negativePrompt`, `personGeneration`, `enhancePrompt`, `conditioningScale` | 0,20–0,60 $ per sn |
| `google/veo-3.1-fast` | 4/6/8 | 720p–4K | 16:9, 9:16 | ilk+son | ✔ | ✔ | aynı | 0,08–0,30 $ per sn |
| `google/veo-3.1-lite` | 4/6/8 | 720p, 1080p | 16:9, 9:16 | ilk+son | ✔ | ✔ | aynı | 0,03–0,08 $ per sn |
| `kwaivgi/kling-v3.0-std` | 3–15 | 720p | 16:9, 9:16, 1:1 | ilk+son | ✔ | – | **`negative_prompt`, `cfg_scale`** | 0,084 $ (sessiz) / 0,126 $ (sesli) per sn |
| `kwaivgi/kling-v3.0-pro` | 3–15 | 720p | 16:9, 9:16, 1:1 | ilk+son | ✔ | – | aynı | 0,112 / 0,168 $ per sn |
| `kwaivgi/kling-video-o1` | 5/10 | 720p | 16:9, 9:16, 1:1 | ilk+son | ✔ | – | `negative_prompt` | 0,112 $ per sn |
| `alibaba/wan-2.7` | 2–10 | 720p, 1080p | 5 oran | ilk+son | ✔ | ✔ | `negative_prompt`, `prompt_extend` | 0,10 $ per sn |
| `alibaba/wan-3.0` | **2–30** | 480p–1080p | 5 oran | ilk | ✔ | ✔ | – | 0,05–0,20 $ per sn |
| `alibaba/happyhorse-1.1` | 3–15 | 720p, 1080p | 7 oran | ilk | – | ✔ | – | 0,0988 / 0,1278 $ per sn |
| `bytedance/seedance-2.0` | 4–15 | 480p–**4K** | 7 oran | ilk+son | ✔ | ✔ | `watermark` | token bazlı |
| `bytedance/seedance-2.5` | 4–30 | 480p, 720p | 6 oran | ilk+son | ✔ | ✔ | `watermark`, `output_format` | token bazlı |
| `minimax/hailuo-2.3` | 6/10 | 1080p | 16:9 | ilk | – | – | `prompt_optimizer`, `fast_pretreatment` | 0,0817 $ per sn |
| `minimax/hailuo-3` | 5–15 | 2K | 6 oran | ilk+son | ✔ | – | `aigc_watermark` | 0,13 $ per sn + 0,04 $ referans görsel |
| `x-ai/grok-imagine-video` | 1–15 | 480p, 720p | 7 oran | ilk | – | – | – | 0,05 / 0,07 $ per sn |
| `x-ai/grok-imagine-video-1.5` | 1–15 | 480p–1080p | 7 oran | ilk | – | – | – | 0,08–0,25 $ per sn |
| `runway/gen-4.5` | 2–10 | 720p | 16:9, 9:16 | ilk | – | ✔ | `contentModeration` | 0,12 $ per sn |
| `runway/aleph-2` | – | – | 8 oran | – | – | ✔ | `keyframes`, `contentModeration` | 0,28 $ per sn, min 0,56 $ |
| `black-forest-labs/flux-3-video` | 5–20 | 720p, 1080p | 6 oran | ilk+son | ✔ | – | `safety_tolerance` | 0,17 / 0,29 $ per sn |
| `heygen/avatar-iv` | – | 720p, 1080p | 16:9, 9:16, 1:1 | – | – | – | `voice_id`, `voice_settings`, `motion_prompt`, `expressiveness`, `fit`, `remove_background`, `background`, `caption`, `title` | 0,05 $ per sn |
| `black-forest-labs/flux-video-upscale` | – | – | – | – | – | – | `safety_tolerance`; `upscale_factor` 1.5–3, `creativity` 0–1 | megapiksel-saniye |

**Bugünkü kodda `aspect_ratio` videoya hiç gönderilmiyor.** Bu bir eksik değil, hata: dikey video üretilemiyor. Paket A'nın ilk maddesi.

### 2.4 Seslendirme — `POST /audio/speech` *(bugün hiç kullanılmıyor)*

İstek gövdesi: `model`, `input`, `voice`, `response_format` (`mp3`/`pcm`), `speed` (0.5–2.0), `input_references` (**ses klonlama**), `provider.options`. Yanıt ham ses baytı; `X-Generation-Id` başlığı geliyor.

18 model:

| Model | Ses sayısı | Fiyat (karakter) | Not |
|---|---|---|---|
| `deepgram/aura-2` | 90 | 0,00003 $ | 7 dil (en, de, es, fr, it, ja, nl) |
| `hexgrad/kokoro-82m` | 54 | 0,000004 $ | En ucuz, açık kaynak |
| `minimax/speech-2.8-hd` | 45 | 0,0001 $ | Ses adları karakter tarifi: `English_Whispering_girl` |
| `minimax/speech-2.8-turbo` | 45 | 0,00006 $ | HD'nin hızlı hali |
| `deepgram/flux-tts:free` | 36 | **ücretsiz** | Sınıfta risksiz deneme |
| `google/gemini-3.1-flash-tts-preview` | 30 | 0,000001 $ | Zephyr, Puck, Kore, Charon… çok dilli |
| `mistralai/voxtral-mini-tts-2603` | 30 | 0,000016 $ | Ses adında duygu: `en_paul_angry`, `gb_oliver_curious` |
| `canopylabs/orpheus-3b-0.1-ft` | 7 | 0,000015 $ | Açık kaynak |
| `sesame/csm-1b` | 7 | 0,000007 $ | Sohbet/okuma ayrımı |
| `x-ai/grok-voice-tts-1.0` | 5 | 0,000015 $ | eve, ara, rex, sal, leo |
| `microsoft/mai-voice-2` (+`-flash`) | 4 | 0,000022 $ | **`style` (cheerful/sad/angry/excited) + `styledegree` yoğunluk kadranı** |
| `fish-audio/s2.1-pro` (+`:free`, `s1`, `s2-pro`) | – | 0,000015 $ | **Ses klonlama**; sabit ses listesi yok |

`openai/*` modellerinde `provider.options.openai.instructions` ile serbest metin ton yönergesi gönderilebiliyor ("sıcak ve arkadaşça konuş").

**Türkçe uyarısı:** hiçbir modelin ses listesinde adı Türkçe olan ses yok. Gemini TTS, fish-audio ve MiniMax çok dilli. **Hiçbir ses, canlı Türkçe testi yapılmadan derse sokulmayacak** (bkz. §11).

### 2.5 Konuşmadan metne — `POST /audio/transcriptions` *(bugün hiç kullanılmıyor)*

20 model: `openai/whisper-large-v3-turbo` (0,0000033 $), `openai/whisper-large-v3`, `openai/gpt-transcribe`, `openai/gpt-4o-mini-transcribe`, `google/chirp-3`, `deepgram/nova-3`, `qwen/qwen3-asr-*`, `mistralai/voxtral-mini-transcribe`, `nvidia/parakeet-tdt-0.6b-v3`, `microsoft/mai-transcribe-2`, `x-ai/grok-stt-1.0`, `fish-audio/transcribe-1`.

İki işe yarıyor: yeni bir ders kategorisi, ve **prompt yazmanın alternatif giriş yolu** — 10 yaşındaki bir çocuk için klavyeden çok daha doğal.

---

## 3. Rol modeli — kim neyi görür

Bu planın ana ürün kararı: **aynı stüdyo, üç seviye.** Öğrenci paneli sadeleştirilmiş bir alt küme görür; öğretmen ve admin panellerinde kontrollerin tamamı bulunur.

### 3.1 Seviyeler

| Seviye | Kim | Felsefe |
|---|---|---|
| **Öğrenci** | `student` rolü | Anlamlı, az sayıda, ön ayarlı. Her kontrol bir ders kavramına karşılık gelir. Sayısal kadran yerine 3 seçenekli düğme. Bütçe tavanları sert. |
| **Öğretmen** | `teacher` rolü | Tam aralık, ham sayılar, negatif prompt, sağlayıcıya özel kadranlar. Öğretmenin cevher limiti yok (`unlimited`), ama üretim başına tavan yine geçerli. |
| **Admin** | `admin` rolü | Öğretmenin gördüğü her şey + hata ayıklama katmanı: sağlayıcı yönlendirme, `size` birebir piksel, `logit_bias`, `logprobs`, maliyet dökümü, ham yanıt. |

Roller zaten rotada okunuyor (`has_role` çağrıları `generate/route.ts` içinde). Aralık sınırları oradan türetilecek. **İstemci tarafındaki gizleme kozmetiktir; sunucu her parametreyi role göre yeniden kısıtlar** — `maxImageInputs` için bugün uygulanan disiplinin aynısı.

### 3.2 Kontrol matrisi

Ö = Öğrenci · Ög = Öğretmen · A = Admin · ⛔ = Hiç kimse (sunucuda sabit)

#### Metin

| Kontrol | Ö | Ög | A | Öğrencide nasıl görünür |
|---|---|---|---|---|
| Sistem promptu / karakter | ● | ● | ● | Ö: hazır karakter kartları listesi. Ög/A: serbest metin |
| `temperature` (Yaratıcılık) | ● | ● | ● | Ö: Kurallı / Dengeli / Çılgın. Ög/A: 0–2 kadran |
| `max_tokens` (Cevap uzunluğu) | ● | ● | ● | Ö: Kısa / Orta / Uzun. Ög/A: sayı |
| `seed` (Tohum) | ● | ● | ● | Zar düğmesi + kilit ikonu |
| `reasoning` + `reasoning_effort` | ● | ● | ● | Ö: Düşünmesini göster aç/kapa. Ög/A: low→max |
| Web araması (`:online`) | ● | ● | ● | Ö: İnternete bak aç/kapa + cevher notu |
| `top_p` | – | ● | ● | – |
| `verbosity` | – | ● | ● | – |
| `response_format` / `structured_outputs` | – | ● | ● | – |
| `stop` dizileri | – | ● | ● | – |
| `frequency_penalty`, `presence_penalty`, `repetition_penalty` | – | ● | ● | – |
| `top_k`, `min_p`, `top_a` | – | – | ● | – |
| `logit_bias`, `logprobs`, `top_logprobs` | – | – | ● | – |
| `tools` / `tool_choice` | – | – | ● | v1'de kapalı |

#### Görsel

| Kontrol | Ö | Ög | A | Sınır farkı |
|---|---|---|---|---|
| `aspect_ratio` | ● | ● | ● | Ö: modelin desteklediği en yaygın 6; Ög/A: hepsi |
| `resolution` | ● | ● | ● | Ö: 1K tavan; Ög: 2K; A: 4K |
| `n` (varyant sayısı) | ● | ● | ● | Ö: ≤2; Ög: ≤4; A: model tavanı |
| `background: transparent` | ● | ● | ● | Sticker dersinin kalbi |
| `seed` | ● | ● | ● | – |
| `quality` | – | ● | ● | Ö'de `auto` sabit |
| `output_format` | – | ● | ● | Ö'de otomatik; Ög/A: png/jpeg/webp/svg |
| `output_compression` | – | – | ● | – |
| `steps`, `guidance` (FLUX) | – | ● | ● | – |
| `style_id`, `style_match`, `controls` (Recraft) | ◐ | ● | ● | Ö: hazır stil çipleri; Ög/A: ham değerler |
| `size` (birebir piksel) | – | – | ● | – |
| Sağlayıcı yönlendirme (`provider.only/order/sort`) | – | – | ● | – |

#### Video

| Kontrol | Ö | Ög | A | Sınır farkı |
|---|---|---|---|---|
| `duration` | ● | ● | ● | Ö: ≤8 sn; Ög/A: model tavanı (Wan 3.0'da 30 sn) |
| `resolution` | ● | ● | ● | Ö: ≤720p; Ög: 1080p; A: 4K |
| `aspect_ratio` | ● | ● | ● | – |
| `frame_images[first]` | ● | ● | ● | Bugün var |
| `frame_images[last]` (Bitiş karesi) | ● | ● | ● | Yeni; ders değeri yüksek |
| `generate_audio` | ● | ● | ● | Hem kontrol hem ~%40 tasarruf |
| `seed` | ● | ● | ● | – |
| `prompt_optimizer` / `enhancePrompt` / `prompt_extend` | ● | ● | ● | "Model promptunu genişletsin mi?" — iyi bir ders anı |
| `negative_prompt` | – | ● | ● | Ö'de kapalı: içerik denetimi gerekiyor |
| `cfg_scale` (Kling) | – | ● | ● | – |
| `input_references` (stil referansı) | – | ● | ● | v2'de öğrenciye açılabilir |
| `conditioningScale` (Veo) | – | – | ● | – |
| `quality`, `style` (Sora) | – | ● | ● | – |
| `upscale_factor`, `creativity` (video upscale) | – | ● | ● | – |
| `personGeneration` | ⛔ | ⛔ | ⛔ | Sunucuda güvenli değerde sabit |
| `safety_tolerance` | ⛔ | ⛔ | ⛔ | Aynı |
| `moderation`, `contentModeration` | ⛔ | ⛔ | ⛔ | Aynı |
| `watermark` / `aigc_watermark` | ⛔ | ⛔ | ⛔ | Yapay zeka etiketini kaldırmak müfredatın etik bölümüne aykırı |
| `callback_url` | ⛔ | ⛔ | ⛔ | Sunucu içi; webhook adresi kullanıcıya açılmaz |

#### Seslendirme (TTS)

| Kontrol | Ö | Ög | A |
|---|---|---|---|
| Model + `voice` seçici | ● | ● | ● |
| `speed` | ● | ● | ● |
| `style` + `styledegree` (MAI-Voice) | ● | ● | ● |
| `response_format` | – | ● | ● |
| `instructions` (OpenAI ton yönergesi) | – | ● | ● |
| `input_references` (**ses klonlama**) | – | ● | ● |

Ses klonlaması bilerek öğrenciye kapalı: başkasının sesini klonlamak rıza gerektirir. Öğretmen kendi sesini bir kez örnekleyip sınıfa karakter sesi olarak sunabilir — hem Türkçe garantisi hem hoş bir ders anı.

#### Konuşmadan metne (STT)

| Kontrol | Ö | Ög | A |
|---|---|---|---|
| Mikrofonla prompt yazdırma | ● | ● | ● |
| Model seçimi, dil ipucu, ham çıktı | – | ● | ● |

#### Ortak

| Kontrol | Ö | Ög | A |
|---|---|---|---|
| Hafıza anahtarı (mevcut) | ● | ● | ● |
| Karşılaştır (mevcut) | ● | ● | ● |
| **A/B: aynı model, iki ayar** (yeni) | ● | ● | ● |
| Ayarları sıfırla | ● | ● | ● |
| **`</>` istek önizleme** | ● | ● | ● |
| Kayıtlı ayar (preset) kullanma | ● | ● | ● |
| Kayıtlı ayar oluşturup sınıfa dağıtma | – | ● | ● |
| Maliyet dökümü (SKU bazında) | – | – | ● |
| Ham OpenRouter yanıtı | – | – | ● |

---

## 4. Bilgi ikonu (i) — açıklama baloncukları

**Şart:** Her düzenleme kontrolünün üzerinde bir (i) ikonu olacak; üzerine gelince o ayarın ne yaptığını anlatan bir baloncuk çıkacak.

### 4.1 Teknik gereksinimler

- **Dokunmatikte de çalışmalı.** Öğrenciler tablet kullanıyor; `:hover` tek başına yetmez. İkon aynı zamanda tıklanabilir olacak ve popover açacak (mevcut `Popover` bileşeni kullanılır). Masaüstünde hover, dokunmatikte tıklama — ikisi de aynı içeriği gösterir.
- **Erişilebilirlik:** ikon `<button type="button" aria-label="Bu ayar ne yapar?">`, baloncuk `role="tooltip"` ve kontrolle `aria-describedby` üzerinden bağlı. Klavyeyle sekmelenebilir, Esc ile kapanır.
- **İki kayıt (register).** Her açıklama iki cümleden oluşur:
  - **Birinci satır:** 10 yaşındaki bir çocuğun anlayacağı dil. Her rolde görünür.
  - **İkinci satır (teknik):** parametrenin gerçek adı, aralığı ve varsayılanı. **Sadece öğretmen ve admin panelinde** görünür.
- **Tek kaynak.** Açıklamalar `lib/playground/param-docs.ts` içinde tek bir sözlükte tutulur:

  ```ts
  export interface ParamDoc {
    /** Kontrolün ekrandaki adı. */
    label: string;
    /** Çocuk dilinde tek cümle. Her rolde görünür. */
    kid: string;
    /** Parametrenin gerçek adı, aralığı, varsayılanı. Sadece öğretmen/admin. */
    technical?: string;
    /** Cevheri etkiliyorsa tek cümlelik uyarı. */
    costNote?: string;
  }
  ```

  **Bu sözlük aynı zamanda `</>` panelindeki satır açıklamalarını besler** (bkz. §5). İki yerde iki farklı metin tutulmaz — bir ayar bir kez anlatılır.

### 4.2 Baloncuk metinleri (ilk taslak)

Bu metinler uygulanırken aynen kullanılabilir; ton, mevcut composer tooltip'lerinin tonuyla aynı tutuldu.

| Kontrol | Çocuk satırı | Teknik satır (Ög/A) | Cevher notu |
|---|---|---|---|
| Yaratıcılık | "Düşük olursa model kurallara sıkı sıkı uyar, yüksek olursa daha çok risk alır ve şaşırtır." | `temperature` · 0–2 · varsayılan 1 | – |
| Cevap uzunluğu | "Modelin en fazla ne kadar uzun yazabileceğini belirler. Kısa seçersen cümlesi yarıda kesilebilir." | `max_tokens` · model bazlı tavan | Uzun cevap daha çok token, daha çok cevher demek |
| Tohum | "Aynı tohumu kilitlersen, aynı istekle aynı sonucu tekrar alırsın. Tek bir kelimeyi değiştirip farkı görmek için kullan." | `seed` · tam sayı · sağlayıcı garanti etmez | – |
| Düşünmesini göster | "Model cevabı yazmadan önce kafasından geçenleri görürsün." | `reasoning.enabled` + `reasoning_effort` | Bu modelde düşünme zaten ücretli, göstermek ek maliyet getirmez |
| İnternete bak | "Model kendi bildikleriyle yetinmez, internetten güncel bilgi arar ve kaynak gösterir." | `:online` varyantı / web arama eklentisi | Her arama ayrıca ücretlendirilir |
| Şekil (en-boy) | "Görselin dikey mi, kare mi, geniş mi olacağını seçersin. Sticker dikey, afiş geniş olur." | `aspect_ratio` · modele göre 6–18 seçenek | – |
| Çözünürlük | "Görselin kaç piksel olacağı. Büyük seçersen detay artar, ama üretim pahalılaşır." | `resolution` · 512/1K/2K/4K | Her kademe fiyatı yaklaşık iki katına çıkarır |
| Varyant sayısı | "Aynı istekten kaç farklı sonuç üretileceği. Dördünü yan yana görüp beğendiğini seçersin." | `n` · 1–10 (modele göre) | Cevher varyant sayısıyla çarpılır |
| Şeffaf arka plan | "Arka planı boş bırakır. Sticker ve logo için tam da bu lazım — sonradan silmene gerek kalmaz." | `background: transparent` · sadece destekleyen modellerde | – |
| Kalite | "Modelin ne kadar uğraşacağı. Yüksek daha temiz sonuç verir ama daha yavaş ve pahalıdır." | `quality` · auto/low/medium/high | Yüksek kalite maliyeti belirgin artırır |
| Dosya biçimi | "Görselin hangi dosya türünde geleceği. SVG seçersen büyütünce hiç bozulmaz — logo için en iyisi." | `output_format` · png/jpeg/webp/svg | – |
| Adım sayısı | "Model görseli kaç turda temize çeker. Fazla adım daha ince detay demek." | `steps` (FLUX geçiş parametresi) | Adım arttıkça süre ve maliyet artar |
| Prompta bağlılık | "Model senin yazdığına ne kadar sıkı bağlı kalsın. Yüksek olursa kelimesi kelimesine uyar, düşük olursa kendi yorumunu katar." | `guidance` / `cfg_scale` | – |
| Süre | "Videonun kaç saniye olacağı." | `duration` · modele göre 1–30 sn | Fiyat doğrudan saniyeyle çarpılır |
| Sesli üret | "Video kendi sesiyle mi gelsin, sessiz mi. Sessiz seçersen belirgin şekilde ucuzlar." | `generate_audio` | Sesli üretim yaklaşık %40 daha pahalı |
| İlk kare | "Video bu görselden başlar; model onu hareketlendirir." | `frame_images[first_frame]` | Ek ücreti yok |
| Bitiş karesi | "Videonun nerede biteceğini de sen söylersin; model arasını doldurur." | `frame_images[last_frame]` | Ek ücreti yok |
| İstemediklerin | "Görselde/videoda görmek istemediğin şeyleri yazarsın: 'bulanık, fazladan parmak' gibi." | `negative_prompt` | – |
| Promptu genişletsin | "Model senin kısa isteğini kendi kendine detaylandırır. Bazen daha iyi sonuç verir, ama artık prompt tam olarak senin değildir." | `prompt_optimizer` / `enhancePrompt` / `prompt_extend` | – |
| Ses | "Metni hangi sesin okuyacağı." | `voice` · modele göre 2–90 seçenek | – |
| Konuşma hızı | "Sesin ne kadar hızlı konuşacağı." | `speed` · 0.5–2.0 · varsayılan 1.0 | – |
| Duygu | "Sesin hangi ruh haliyle konuşacağı: neşeli, üzgün, heyecanlı." | `provider.options.azure.style` + `styledegree` | – |
| Hafıza | *(mevcut metin korunur)* | – | – |

---

## 5. `</>` — istek önizleme paneli

**Şart:** Bütün ayarlar yapıldıktan sonra, prompt gönderilmeden önce; yazdığımız promptun ve yaptığımız ayarların **kod olarak nasıl gittiğini** gösteren bir `</>` düğmesi.

Bu, planın en yüksek ders değerine sahip parçası: müfredatın "yapay zekaya nasıl istek gidiyor" konusunu soyut anlatmak yerine öğrencinin kendi isteğinde göstermek.

### 5.1 Davranış

- Düğme composer'da, gönder düğmesinin yanında. İkon `</>`.
- Basınca panel açılır; **kapatmadan ayar değiştirilebilir ve JSON canlı güncellenir.** Asıl öğretici an bu: kadranı oynat, kodun hangi satırının değiştiğini gör.
- Panelde üç şey var:
  1. **Hedef satırı:** `POST https://openrouter.ai/api/v1/images`
  2. **Gövde:** biçimlendirilmiş, renklendirilmiş JSON
  3. **Maliyet satırı:** "Bu ayarlarla: 8 sn · 1080p · sesli — **24 cevher**"
- Üç düğme: **Kopyala**, **Açıklamalı göster**, **cURL olarak göster**.

### 5.2 Açıklamalı mod

Aynı JSON, her satırın yanında `param-docs.ts`'ten gelen çocuk cümlesi:

```jsonc
{
  "model": "google/veo-3.1-fast",   // Hangi yapay zeka modeli çalışacak
  "prompt": "kar altında koşan turuncu bir tilki, sinematik",
  "duration": 8,                    // Videonun kaç saniye olacağı
  "resolution": "1080p",            // Videonun kaç piksel olacağı
  "aspect_ratio": "9:16",           // Dikey, telefon ekranı gibi
  "generate_audio": true,           // Video kendi sesiyle gelsin
  "seed": 4213                      // Aynı tohum, aynı sonuç
}
```

Tek sözlük hem baloncukları hem bu yorumları besler.

### 5.3 Gizleme kuralları (bunlar zorunlu)

| Ne | Nasıl gösterilir |
|---|---|
| API anahtarı | **Hiçbir zaman, hiçbir rolde.** Başlık satırı `Authorization: Bearer ••••••` olarak ve "anahtar sunucuda kalır, tarayıcıya hiç gelmez" notuyla gösterilir |
| Görsel eki (data URL) | `"data:image/png;base64, … (1,2 MB)"` — ilk 24 karakter + boyut |
| İmzalı depolama URL'i | `"https://…/playground-inputs/… (imzalı, 1 saat geçerli)"` |
| Sistem promptu | Ö: `"<sistem promptu>"` yer tutucusu. Ög/A: tam metin |
| Sunucuda kilitli güvenlik parametreleri | Hiç gösterilmez — panel öğrencinin/öğretmenin kontrol ettiği gövdeyi gösterir, sunucunun eklediği kilitleri değil |

### 5.4 Bilerek yapılmayanlar

- **JSON düzenlenemez.** Panel v1'de salt okunur. Ham gövde düzenleme, sunucu tarafı doğrulamayı baypas etme girişimlerine davetiye çıkarır; istenirse ileride sadece admin için açılır.
- **Gerçek istek buradan atılmaz.** Panel, gönder düğmesinin ne yapacağını gösterir; kendisi bir gönderme yolu değildir.

---

## 6. Stüdyo paneli — arayüz

### 6.1 Yerleşim

Mevcut composer'da doğru olan şey korunacak: kontroller "gönder'e basınca ne olacak" sorusuna cevap veren **tek bir satırda** toplu (Hafıza, Şekil, Karşılaştır). Yeni kadranların hepsi oraya sığmaz.

Öneri: `LessonTools` ile aynı desende ikinci bir düğme — **Stüdyo**. Popover/drawer açar.

- **Kadranlar modelden türer, elle yazılmaz.** Panel `tool.capabilities`'i okur, ne varsa onu çizer. Sora'da tohum kadranı hiç görünmez; Recraft'ta SVG anahtarı görünür. Bugünkü `maxImageInputs` mantığının genelleştirilmiş hali.
- **İki katman.** `prompt-cards.ts`'teki `advanced: true` deseni birebir uygulanır: çocuk açınca 3–4 kadran görür, "Daha fazla"ya basınca gerisi açılır.
- **Değişiklik rozeti.** Stüdyo düğmesinin üzerinde, varsayılandan sapan ayar sayısı küçük bir sayı olarak durur ("Stüdyo · 3"). Çocuk neyi değiştirdiğini unutmasın.
- **Ayarları sıfırla** düğmesi panelin altında.
- **Fiyat canlı yazar.** Kadran her oynadığında composer'ın alt satırı güncellenir: "8 sn · 1080p · sesli — 24 cevher". Hem koruma hem en iyi ekonomi dersi.
- **Ayarlar hatırlanır.** `pg-memory` için kurulan `localStorage` deseni, model başına stüdyo ayarları için de kullanılır (`pg-studio-<toolId>`).

### 6.2 Sonuç balonunda ayar rozeti

Üretim bittiğinde çıktının altında küçük bir çip: `⚙ 8 sn · 1080p · tohum 4213`. Tıklanınca o ayarları stüdyoya geri yükler. Eski bir sohbeti açan öğrenci, o sonucu neyin ürettiğini görebilir — `params jsonb` sütunu (§8) tam olarak bunun için var.

### 6.3 "Aynı tohumla tekrar üret"

Sonuç balonunun altında ikinci düğme. Tohumu kilitler, promptu composer'a geri koyar. Müfredatın merdiven mantığının tam karşılığı: tek değişkeni değiştir, farkı gör. `lesson-runs.ts`'teki tur sistemine "Tohum merdiveni" olarak da eklenir.

### 6.4 Karşılaştırmanın yeni modu: A/B ayar

Mevcut `CompareSwitch` "aynı istek, iki model" yapıyor. Buna ikinci mod ekleniyor: **"aynı model, iki ayar"**. Sol taraf mevcut ayarlarla, sağ taraf tek bir kadranı değiştirilmiş halde üretir. Bu, bir parametrenin ne işe yaradığını anlatmanın en hızlı yolu ve bugünkü altyapıyla (mesaj başına `tool_id` tutan şema) sıfır şema değişikliğiyle çalışır.

Videoda karşılaştırma kapalı kalmaya devam eder (mevcut gerekçe geçerli: iki video hem pahalı hem yavaş).

---

## 7. Cevher fiyatlandırması — sabit sayıdan formüle

**Bu, stüdyonun ön koşulu.** Süre, çözünürlük ve varyant sayısı kullanıcının eline geçtiği anda `oreCost: 9` gibi tek sayı çöker.

### 7.1 Sorunun büyüklüğü (0,04 $ = 1 cevher oranıyla, `pricing_skus`'tan)

| Ayar | Gerçek maliyet | Cevher |
|---|---|---|
| Veo 3.1 Lite · 4 sn · 720p · sessiz | 0,12 $ | 3 |
| Veo 3.1 Lite · 4 sn · 720p · sesli | 0,20 $ | 5 *(bugünkü sabit)* |
| Veo 3.1 Fast · 8 sn · 1080p · sesli | 0,96 $ | 24 |
| Kling 3.0 Std · 15 sn · sesli | 1,89 $ | 47 |
| Wan 3.0 · 10 sn · 1080p | 2,00 $ | 50 |
| **Sora 2 Pro · 12 sn · 1080p** | **6,00 $** | **150** |

### 7.2 Yapılacak

1. `generationOreCost(tool, imageCount)` → `generationOreCost(tool, params)` olarak genişletilir. Görsel eki için kurulan desen zaten doğru; sadece girdi kümesi büyüyor.
2. Her aracın `pricing_skus` verisi katalogda tutulur (senkron script'inden gelir).
3. Modalite başına formül:
   - **Video:** `saniye × çözünürlük_SKU × (sesli ? sesli_SKU : sessiz_SKU)`
   - **Görsel:** `taban(çözünürlük, kalite) × n`
   - **TTS:** `karakter_sayısı × karakter_fiyatı`
   - **Metin:** bugünkü sabit korunur; internet araması açıksa arama başına ek kalem
4. **Üretim başına tavan: 60 cevher.** Hiçbir kadran kombinasyonu tek üretimde bunu aşamaz; aştığında kadranlar sınıra dayanır ve arayüz nedenini söyler.
5. **Rol bazlı aralık sınırları** (§3.2) tavanın ikinci savunma hattıdır.
6. Composer'ın alt satırı ve `</>` panelinin maliyet satırı **aynı fonksiyonu** çağırır. İstemci ve sunucu farklı sayı söylemez.

---

## 8. Veri modeli

Tek şema değişikliği:

```sql
alter table public.ai_generations
  add column if not exists params jsonb;
```

- `rpc_start_generation` yeni bir `p_params jsonb` argümanı alır ve satıra yazar.
- Ne işe yarar: (a) sonuç balonundaki ayar rozeti, (b) "aynı tohumla tekrar üret", (c) admin'in hangi ayarların para yaktığını görmesi, (d) şeffaf faturalandırma.
- **Sohbet geçmişi tabloları değişmez.** `playground_chat_messages` üzerinden `generation_id` ile bağlanılır; bu bağ zaten var.

Kayıtlı ayarlar (preset) v2'de gelirse ayrı bir tablo gerekir; v1'de `localStorage` yeterli. Öğretmenin sınıfa ayar dağıtması v2 kapsamındadır ve o zaman `playground_presets` tablosu açılır.

---

## 9. Katalog senkron script'i

`tools.ts` başındaki uyarı ("asla hafızadan slug'a güvenme") doğru ve haklı. Ama araç başına 8–12 parametre, aralık ve fiyat SKU'su elle yazılamaz; sessizce eskir.

**Yapılacak:** `scripts/sync-catalog.ts`

- Çeker: `GET /models`, `GET /models?output_modalities=image|video|speech|transcription`, `GET /images/models`, `GET /videos/models`, ve kullanılan her model için `GET /images/models/{id}/endpoints` (geçiş parametreleri buradan gelir).
- Üretir: `lib/playground/tools.generated.ts` — yetenekler, aralıklar, desteklenen oranlar/süreler/çözünürlükler, `pricing_skus`, `allowed_passthrough_parameters`.
- Elle kalan kısım sadece **ürün kararları**: Türkçe ad, açıklama, ikon, kategori, `status`, rol tavanları, cevher yuvarlama tercihi.
- CI'da veya elle çalıştırılır; çıktısı commit edilir (çalışma zamanında ağ çağrısı yok).
- Bir model katalogdan düşerse script uyarır; sessizce `status: "soon"`a çevirmez — kararı insan verir.

**Parametre kayması koruması:** Panel, modelin desteklemediği bir parametreyi asla göndermez; sunucu da göndermeden önce yetenek listesine karşı süzer. Bir çocuğun karşısına OpenRouter'ın 400'ü çıkmaz. Buna rağmen 400 gelirse (katalog eskimişse), OpenRouter yanıtı desteklenen değerleri listeliyor — bu Türkçeye çevrilip ilgili kadran otomatik düzeltilir.

---

## 10. Model ve kategori genişletmesi

### 10.1 "Yakında"dan "canlı"ya çevrilebilecekler

| Katalogdaki araç | Durum |
|---|---|
| **Runway** | `runway/gen-4.5` (0,12 $/sn) ve `runway/aleph-2` (0,28 $/sn, min 0,56 $) canlı |
| **HeyGen** | `heygen/avatar-iv` canlı; `voice_id`, `motion_prompt`, `expressiveness`, `remove_background` geçiş parametreleriyle. "Konuşan 3D Avatar" maddesini de karşılar |
| ElevenLabs, Suno, Udio, Ideogram, Meshy, Blockade, Remini, Photomath, Descript | OpenRouter'da **yok**. Kendi vendor anahtarları gerekir; bu planın kapsamı dışında. ElevenLabs'ın ders değerini (ses klonlama) fish-audio ve MiniMax bugün canlı veriyor |

### 10.2 Eklenebilecek canlı modeller

**Görsel** (52 model var, 12 kullanılıyor): `qwen/qwen-image-3`, `sourceful/riverflow-v2.5-pro` (şeffaf + 4K), `black-forest-labs/flux.2-max`, `flux.2-klein-4b`, `bytedance-seed/seedream-5-0-pro`, `x-ai/grok-imagine-image-2.0`, `microsoft/mai-image-2.6-flash`, `openai/gpt-image-1-mini` (çok ucuz, deneme dersi için ideal), `meta/muse-image`, `krea/krea-2-medium-turbo`, `recraft/recraft-v4.1-vector` (SVG).

**Video** (28 model, 10 kullanılıyor): `google/veo-3.1` (tam sürüm), `kwaivgi/kling-v3.0-pro`, `kwaivgi/kling-video-o1`, `minimax/hailuo-3`, `hailuo-3-max`, `alibaba/wan-3.0` (2–30 sn), `bytedance/seedance-2.5`, `black-forest-labs/flux-3-video`, `black-forest-labs/flux-video-upscale`.

**Metin** — marka tanıma hedefi için eksik olanlar: `moonshotai/kimi-k3`, `z-ai/glm-5.3`, `minimax/minimax-m3`, `cohere/command-a`, `tencent/hy3` (Hunyuan), `baidu/ernie-4.5-vl-424b-a47b`, `nvidia/nemotron-3-ultra-550b-a55b`, `ibm-granite/granite-4.2-8b`, `microsoft/phi-4`, `upstage/solar-pro4`, `rekaai/reka-flash-3`, `google/gemma-4-31b-it:free`. Baidu ve Tencent özellikle değerli: müfredat "dünyanın dört bir yanı" diyor, Çin'in iki devi listede yok.

**Ücretsiz kulvar:** 18 adet `:free` model var. Sınıfta cevher yakmadan deneme yaptırmak için ayrı bir rozet düşünülebilir.

### 10.3 Yeni kategoriler

| Kategori | İçerik | Gerekçe |
|---|---|---|
| **Seslendirme** (TTS'i Müzik'ten ayır) | Aura-2, Kokoro, MiniMax Speech, Voxtral, Grok Voice, MAI-Voice, fish-audio | Ses seçimi ve klonlama, müzik bestelemekten bambaşka bir ders |
| **Dinle & Yaz** (STT) | Whisper, Chirp 3, Nova-3, Voxtral | Yeni ders türü + prompt girişini kolaylaştırır |
| **Onarım & Büyütme** | `flux-video-upscale`, görsel upscale | Remini maddesinin yapılabilir hali |
| **Konuşan Avatar** | `heygen/avatar-iv` | "Yakında" maddesini kapatır |

---

## 11. Güvenlik ve etik kilitler

Sunucuda sabitlenecek, hiçbir rolde arayüze çıkmayacak:

| Parametre | Model | Neden |
|---|---|---|
| `personGeneration` | Veo 3.1 ailesi | Gerçek insan üretimi kilidi |
| `safety_tolerance` | FLUX.2, flux-3-video, flux-video-upscale | İçerik filtresi gevşetme |
| `moderation` | GPT Image ailesi | Aynı |
| `contentModeration` | Runway | Aynı |
| `watermark` / `aigc_watermark` | Seedance, Hailuo | Yapay zeka etiketini kaldırma — müfredatın etik bölümüne doğrudan aykırı |
| `callback_url` | Tüm video | Sunucu içi altyapı |

Ayrıca:

- **`negative_prompt` öğrenciye kapalı**, öğretmene açık. Açıldığı yerde prompt'a uygulanan içerik denetiminin aynısından geçer.
- **Ses klonlama öğretmen/admin'e kapalı değil, öğrenciye kapalı.** Rıza meselesi; öğretmen kendi sesini kullanır.
- **`</>` paneli hiçbir rolde API anahtarı göstermez.** §5.3'teki gizleme tablosu zorunludur.
- Serbest sistem promptu öğretmen/admin'e açıktır; öğrencide hazır karakter kartları kullanılır.

---

## 12. Paket sırası

Her paket kendi başına gönderilebilir. Sıra bağlayıcıdır: B, C ve D'nin ön koşuludur.

### Paket A — kırık olanı düzelt *(küçük, tasarımdan bağımsız yapılabilir)*
1. Videoya `aspect_ratio` gönder. Bugün hiç gönderilmiyor; dikey video üretilemiyor.
2. `generate_audio` anahtarı — hem yeni kontrol hem ~%40 tasarruf.
3. En-boy oranı listesini 4 sabitten modelin desteklediklerine çevir.

**Kabul ölçütü:** 9:16 istenen bir Veo/Kling çıktısı gerçekten dikey geliyor; sessiz üretimin cevheri sesliden düşük.

### Paket B — cevher formülü + `params` sütunu *(stüdyonun temeli)*
`generationOreCost` genişletmesi, `pricing_skus` katalogda, 60 cevher tavanı, rol bazlı aralıklar, `ai_generations.params`.

**Kabul ölçütü:** Composer'ın gösterdiği cevher, sunucunun düştüğü cevherle birebir aynı; tavan aşılamıyor; her üretimin parametreleri veritabanında.

### Paket C — Görsel stüdyosu
`seed`, `n`, `resolution`, `quality`, `background: transparent`, `output_format` (svg dahil), FLUX `steps`/`guidance`, Recraft `style_id`/`controls`. Şeffaf arka plan gelince `cutout.ts` destekleyen modellerde devre dışı kalır (silinmez — desteklemeyen modeller için gerekli).

### Paket D — Video stüdyosu
`duration`, `resolution`, `last_frame`, `seed`, `negative_prompt`, `cfg_scale`, prompt genişletme anahtarı. Ayrıca `callback_url`: video işlerini webhook'a bağlamak, sekme kapanınca üretimin askıda kalması sorununu kökten çözer (bugün süpürücüyle çözülüyor).

### Paket E — Ses
`/audio/speech` endpoint'i, ses seçici, hız, duygu stili; ardından öğretmen için ses klonlama. Aynı hamlede ElevenLabs ve "Konuşan Avatar" maddeleri kapanır.

### Paket F — Katalog senkron script'i + model genişletmesi
**Önce script, sonra modeller.** Ters sırada yapılırsa 60 model elle yazılmış olur.

### Paket G — STT ve yeni kategoriler
Mikrofonla prompt yazdırma, "Dinle & Yaz" kategorisi, upscale kategorisi.

### Her pakette birlikte gelen
- (i) baloncukları — o pakette eklenen her kontrol için (§4)
- `</>` panelinin o modaliteyi kapsaması (§5)
- Rol matrisine uygunluk (§3.2)
- Sunucu tarafı yeniden doğrulama (istemci gizlemesi kozmetiktir)

---

## 13. Uygulamadan önce canlı test edilecekler

Kodun kendi disiplini gereği, bunlar gerçek istekle denenmeden yazılmayacak:

1. **Türkçe TTS kalitesi.** Hiçbir modelin ses listesinde adı Türkçe olan ses yok. Gemini TTS, fish-audio ve MiniMax aynı Türkçe cümleyle test edilip karşılaştırılmalı. Türkçesi kötü olan model derse girmez.
2. **`provider.options` geçiş parametreleri.** FLUX `steps`/`guidance` ve Recraft `style_id`/`controls` endpoint kayıtlarında yazıyor ama hiç gönderilmedi. Her biri bir kez gerçek istekle denenmeli.
3. **Video `input_references`.** Dokümanda var; ayrıca `frame_images`'ı imzalı HTTPS URL ile göndermenin de henüz canlı denenmediği kodda not düşülmüş (`generate/route.ts`). İkisi birlikte test edilmeli.
4. **`background: transparent` gerçekten şeffaf mı.** `gpt-image-1`, `gpt-image-1-mini` ve Riverflow'da PNG alfa kanalı doğrulanmalı — sticker dersinin tamamı buna bağlanacak.
5. **`n > 1` fiyatlandırması.** Varyant sayısının faturaya doğrusal yansıdığı ölçülmeli; formül buna göre kalibre edilir.
6. **`seed` tekrarlanabilirliği.** Doküman "sağlayıcı garanti etmez" diyor. Hangi modellerde gerçekten aynı sonucu verdiği ölçülmeli; vermeyenlerde kadran gösterilmez.

---

## 14. Bilerek kapsam dışı bırakılanlar

- **Ham JSON düzenleme.** `</>` paneli salt okunur (§5.4).
- **`tools` / araç çağırma.** Metin modellerinde v1'de kapalı; ayrı bir ürün konusu.
- **Kayıtlı ayarların sınıfa dağıtımı.** v1'de `localStorage`; tablo v2'de.
- **OpenRouter Presets özelliği.** Kendi preset sistemimizle çakışır; şimdilik kullanılmıyor.
- **Vendor anahtarı gerektiren araçlar** (ElevenLabs, Suno, Udio, Ideogram, Meshy, Blockade, Remini, Photomath, Descript). Ayrı bir iş kalemi.
- **Sohbet geçmişi şeması.** Dokunulmuyor (§0).

---

## 15. Durum — 7 Eylül 2026, akşam (tasarım geldi, kabuk kuruldu)

Fatih'in nihai tasarımı (`PLayground desingFINALDESİCION.png`, proje kökü) uygulandı. Playground artık panelin "Kâğıt Uzay v2" dilini giyiyor (`.panel-theme`, lacivert bar, krem kartlar); eski `.pg-theme` kesik-kâğıt teması ve `SkyBackground` silindi. Yeni yerleşim `web/src/components/playground/` altında bölündü:

| Dosya | İş |
|---|---|
| `playground.tsx` | Durum ve mantık (gönderme, karşılaştırma, ders turları, geçmiş) + yerleşim |
| `top-bar.tsx` | Lacivert bar: logo (panele döner) · sohbet başlığı · Yeni · Geçmiş · cevher · avatar menüsü |
| `chat-history.tsx` | Sol panel (sunucudan gelen liste; yalnızca çizer) |
| `stage.tsx` | Orta sahne: metin modelinde transkript, görsel/video/ses modelinde **galeri** (büyük çıktı, oklar, filmşeridi, eylem çubuğu) |
| `composer.tsx` | Model çipi · oran çipleri · Hafıza · Gelişmiş ayarlar · prompt · etiket çipleri · ekle · Oluştur |
| `tools-panel.tsx` | Sağ "Düzenleme araçları": Model + kategori çipleri, Boyut & Oran, Hafıza, Karşılaştır, **Gelişmiş (kilitli, "yakında")** |
| `quick-cards.tsx` | Prompt şablonu (LessonTools) · Merdiven prompt · İki modeli karşılaştır |
| `transcript.tsx` | Balonlar, karşılaştırma çifti, model geçiş işareti (markdown tembel yüklenir) |
| `model-picker.tsx` | Kategori/müfredat mega menüsü, B model seçici |
| `lib/playground/prompt-tags.ts` | Modaliteye göre etiket sözlüğü |

**Bu turda plandan yapılanlar:** Paket A/1 (videoya `aspect_ratio` gidiyor) ve A/3 (oran listesi 4 sabitten **modelin canlı katalogdaki listesine** döndü — `tools.ts` içindeki `aspectRatios`, 7 Eylül canlı çekim; sunucu `resolveAspectRatio` ile yalnızca desteklenen değeri gönderir). Paket A/2 (`generate_audio`) yapılmadı.

**Bilerek yapılmayanlar:** Kalite · Stil · Negatif prompt · Seed · varyant sayısı (`n`) — sunucu tarafı ve cevher formülü (Paket B) olmadan ölü kontrol olurdu; sağ panelde kilitli "Gelişmiş" başlığı altında listeleniyor. Sahnedeki "Varyasyon" bugün `n>1` değil: aynı tarif + bu görsel referans (image-to-image), yani mevcut `input_references` yoluyla gerçek bir varyasyon. "Düzenle" tarifi ve görseli composer'a geri koyar.

**Hız:** Playground sayfası oturumu `getClaims` ile yerel doğruluyor (auth sunucusuna gidiş yok); bakiye, sohbet listesi, ad ve hafta sunucuda tek seferde okunup ilk boyaya gömülüyor (`readBalance`, `listChats` paylaşımlı modüller); `app/playground/loading.tsx` iskeleti geçişi anında gösteriyor; giriş sayfası `/dashboard`'u önceden yüklüyor.

---

## 16. Durum — 8 Eylül 2026 (stüdyo açıldı)

Kilitli "Gelişmiş" başlığı kaldırıldı; yerine modelin canlı yeteneklerinden türeyen gerçek kadranlar geldi. **Paket F önce yapıldı** (plan "önce script, sonra modeller" diyordu), sonra B, C, D ve A/2.

### 16.1 Yeni dosyalar

| Dosya | İş |
|---|---|
| `web/scripts/sync-catalog.mjs` | OpenRouter'ın canlı kataloğunu çeker (`/models`, `/images/models`, `/videos/models`, her görsel modelin `/endpoints`'i) ve aşağıdaki dosyayı yazar. Elle çalıştırılır, çıktısı commit edilir, çalışma zamanında ağ çağrısı yok |
| `web/src/lib/playground/capabilities.generated.ts` | **Üretilen dosya, elle düzenlenmez.** 58 modelin parametre aralıkları, enum'ları, süreleri, çözünürlükleri, fiyat SKU'ları. 8 Eylül 2026 çekimi |
| `web/src/lib/playground/params.ts` | Stüdyonun çekirdeği: alan şeması (`studioFields`), rol tavanları, `sanitizeParams` (sunucu tarafı zorlayıcı), `generationCost`, `exceedsCap`, `imageBudget` |
| `web/src/lib/playground/param-docs.ts` | (i) baloncuklarının ve `</>` açıklamalarının **tek** sözlüğü — çocuk cümlesi + teknik satır (Ög/A) + cevher notu |
| `web/src/lib/playground/request.ts` | İstek gövdesini kuran **tek** yer. Hem `generate/route.ts` hem `</>` paneli bunu çağırır |
| `web/src/components/playground/studio-panel.tsx` | Kadranlar, iki katman (`core` / "Daha fazla"), (i) popover'ları, canlı cevher satırı, "Ayarları sıfırla" |
| `supabase/migrations/20260908150000_playground_studio_params.sql` | `ai_generations.params jsonb` + `rpc_start_generation`'a `p_params`. **Canlı veritabanına uygulandı** |

### 16.2 Açılan kadranlar (hepsi canlı katalogdan türer, hiçbiri elle yazılmadı)

- **Metin:** Karakter (5 hazır persona) · Yaratıcılık (öğrencide 3 düğme, personelde 0–2 kadran) · Cevap uzunluğu · Düşünmesini göster + efor · İnternete bak (`:online`) · Tohum · top_p · Ayrıntı düzeyi · Durdurma sözcüğü · üç ceza kadranı · JSON cevap · Ek sistem talimatı (Ög/A) · top_k, min_p (A)
- **Görsel:** Çözünürlük · Şeffaf arka plan · Tohum · Kalite (Ög/A) · Dosya biçimi (Ög/A) · Sıkıştırma (A)
- **Video:** Süre · Çözünürlük · Sesli üret · **Bitiş karesi** · Tohum
- **Ses:** Ses seçici (13 OpenAI sesi) · Tohum · Yaratıcılık (Ög/A)

Persona ve ek talimat sistem promptunun **sonuna eklenir**, yerine geçmez — güvenlik promptunun etrafından dolaşacak bir yol açılmadı.

### 16.3 Canlı doğrulananlar (§13'ün cevapları)

| Test | Sonuç |
|---|---|
| `background: transparent` gerçekten şeffaf mı | ✔ `gpt-image-1`, PNG renk tipi 6 (RGBA), gerçek alfa. $0.011 |
| `frame_images[last_frame]` çalışıyor mu | ✔ Veo 3.1 Lite, ilk kare sticker → son kare maskot; klibin son karesi verilen ikinci görsel. $0.12 |
| `generate_audio: false` | ✔ Dönen MP4'te ses akışı yok; fiyat 0,05→0,03 $/sn'ye düştü |
| Cevher formülü gerçek faturayla tutuyor mu | ✔ Formül 3 cevher (0,12 $) dedi, OpenRouter 0,12 $ faturaladı |
| `:online` web araması her modelde çalışıyor mu | ✔ `google/gemini-2.5-flash:online`, `url_citation` kaynaklarıyla döndü, arama kalemi ~0,008 $ |
| OpenAI ses listesi | ✔ 13 ses (alloy…cedar), uçtan alındı, hepsi tek tek üretim yaptı |
| **Geçiş (passthrough) parametreleri** | ✘ **Çalışmıyor.** Dokümandaki `provider.options.<slug>.parameters` yoluna uydurma bir anahtar da, uydurma bir sağlayıcı slug'ı da hatasız görsel döndürdü — OpenRouter bunları sessizce yok sayıyor. Doğrulanamadı, o yüzden **`steps`, `guidance`, `cfg_scale`, `negative_prompt`, `prompt_optimizer` kadranları açılmadı** |

### 16.4 Cevher: tavan artık indirim değil, ret

`generationCost` her zaman gerçek fiyatı söyler. 60 cevherlik üretim başına tavan, fiyatı kırpmak yerine **göndermeyi reddeder** — kırpmak, 80 cevherlik bir klibi 60'a satmak ve aradaki farkı sessizce kasadan karşılamak demekti. Hem composer (buton kilitlenir, nedenini söyler) hem `generate/route.ts` (hiçbir şey düşülmeden `over_generation_cap` döner) aynı fonksiyonu sorar.

Video fiyatı sağlayıcının kendi `pricing_skus`'undan hesaplanır — gerçek bir teklif. Görsel ve metin, token bazlı faturalandıkları için önceden bilinemez; katalog tabanından ölçeklenen, bilerek muhafazakâr bir **ürün fiyatı**dır.

### 16.5 Eklenen modeller (18)

**Metin (7):** Kimi K3 · GLM-5.3 · MiniMax M3 · Cohere Command A · Tencent Hunyuan 3 · Baidu ERNIE 4.5 · Gemma 4 (ücretsiz).
**Görsel (5):** GPT Image 1 Mini · Riverflow 2.5 Pro (şeffaf + 4K) · Qwen Image 3 · FLUX.2 Max · Meta Muse.
**Video (6):** Veo 3.1 (tam) · Kling 3.0 Pro · Wan 3.0 (30 sn) · Hailuo 3 · Seedance 2.5 · **Runway Gen-4.5** — "yakında" maddesi kapandı.

Müfredatın "dünyanın dört bir yanı" hedefi için Çin'in üç devi (Tencent, Baidu, Zhipu) ve Kanada (Cohere) listeye girdi.

### 16.6 Bilerek yapılmayanlar ve nedenleri

| Ne | Neden |
|---|---|
| Geçiş parametresi kadranları | §16.3: OpenRouter sessizce yok sayıyor. Açılması için tek koşul: aynı promptla iki üretim yapıp `steps`/`cfg_scale` farkının çıktıya yansıdığını ölçmek |
| Varyant sayısı (`n`) | Bir sohbet turu tek bir asistan mesajı ve tek bir `output_path` tutuyor. Dört varyantın üçü yeniden açılışta kaybolurdu; düzeltmesi transkript şemasını açmak demek ve o şema donduruldu (§0) |
| Recraft SVG (`output_format: "svg"`) | Yükleme yolu `image/svg+xml` uzantısını tanımıyor ve canlı test edilmedi. Logo dersinin vektör ayağı bir sonraki tura |
| Paket E (TTS `/audio/speech`) ve G (STT) | Ayrı uç noktalar. §13.1 gereği Türkçe kalitesi canlı test edilmeden derse girmeyecek |
| Preset'lerin sınıfa dağıtımı | v1'de `localStorage` (`pg-studio-<toolId>`, model başına); tablo v2'de |
| `cutout.ts`'in şeffaf modelde devre dışı kalması | Kesme düğmesi artık ana görsel yüzeyi olmayan transcript balonunda; şeffaf çıktıda zararsız çalışıyor |
