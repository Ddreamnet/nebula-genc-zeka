# Playground — büyük geliştirme yol haritası

**Tarih:** 30 Ağustos 2026 · **Durum:** Paket 1 ve 2 kodlandı, gerisi öneri

Bu doküman mevcut kodun tamamı okunarak yazıldı: `components/playground/playground.tsx`
(1314 satır), `lib/playground/tools.ts`, `lib/ai/openrouter.ts`,
`api/playground/**` ve playground migration'ları.

---

## Değişmeyecek olan

**Sohbet geçmişi sistemine dokunulmayacak.** `ChatHistory` bileşeni,
`playground_chats` / `playground_chat_messages` tabloları, `rpc_append_turn`,
`rpc_settle_message` ve `GET/DELETE /api/playground/chats` olduğu gibi kalıyor.

Aşağıdaki her öneri bu kısıta göre tasarlandı: hepsi **ekleme**, hiçbiri
mevcut satırları değiştirmiyor ya da şemayı yeniden kurmuyor. Şanslıyız ki
şema bunu zaten kaldırıyor — `playground_chat_messages.tool_id` mesaj başına
model tutuyor, yani "aynı sohbette iki farklı modelin cevabı" bugünkü tabloya
sıfır değişiklikle sığıyor.

## Bugün zaten doğru olan (bozmayalım)

Öneri listesine geçmeden, mevcut kodda gerçekten iyi olan ve korunması
gereken kararlar:

- Cevher, üretimden **önce** düşülüyor; başarısızlıkta `rpc_finalize_generation`
  iade ediyor ve replay'e karşı korumalı (tek guarded UPDATE).
- Medya, URL değil **bucket yolu** olarak saklanıp okurken imzalanıyor —
  eski sohbeti açınca ölü link çıkmıyor.
- `web` kategorisinin önizleme iframe'i `sandbox="allow-scripts"`, yani
  `allow-same-origin` yok: modelin ürettiği kod sitenin oturumuna erişemiyor.
  Bu doğru yapılmış, model çıktısı çalıştıran her yerde aynı disiplin sürsün.
- Görsel eki üç ayrı mekanizmayla gidiyor (chat `image_url`, `/images`
  `input_references`, `/videos` `frame_images`) ve üçü de canlı doğrulanmış.

---

# Katman 1 — "Gerçek LLM arayüzü" çekirdeği

Bu dördü olmadan ürün, ne kadar iyi görünürse görünsün, bir demo gibi
davranıyor. Sırayla en yüksek etkiden başlıyorlar.

> **✅ 30 Ağustos 2026'da uygulandı — 1.1, 1.2, 1.3 ve 1.4.**
> Aşağıdaki bölümler artık "yapılacak" değil, "nasıl yapıldı"nın kaydı.
> Canlı doğrulanan noktalar:
> - OpenRouter streaming + `usage.cost` son chunk'ta geliyor.
> - `delta.reasoning` DeepSeek R1 ve GPT-5 Mini'de akıyor; akıl yürütmeyen
>   modelde (Llama 3.3) `reasoning` parametresi hata vermiyor, yok sayılıyor.
> - SSE akışında `: OPENROUTER PROCESSING` yorum satırları var, parser atlıyor.
> - Next.js akışı tamponlamıyor: 700ms arayla gönderilen kareler istemciye
>   tam 700ms arayla ulaştı (geçici bir test route'uyla ölçüldü).
> - SSE parser'ı dört bölünme senaryosunda test edildi (tek parça, byte byte,
>   kare ortasından, tek chunk'ta üç kare) — hepsi geçti.
>
> Dosyalar: `lib/ai/openrouter.ts` (`streamText`, paylaşılan `sseEvents`),
> `lib/playground/event-stream.ts` (istemci parser'ı, ayrı modül ki test
> edilebilsin), `api/playground/generate/route.ts` (metin dalı SSE),
> `components/playground/playground.tsx` (akış tüketimi, dur butonu,
> düşünme paneli), `components/playground/markdown.tsx`.
>
> **Sohbet geçmişine dokunulmadı**: tablo yok, sütun yok, RPC değişikliği yok.
> Düşünce zinciri kasten kaydedilmiyor — canlı bir öğretim aracı, kayıt değil;
> saklamak geçmiş şemasına dokunmak demekti.

## 1.1 Streaming — token token cevap

**Sorun.** `lib/ai/openrouter.ts` içindeki `generateText` cevabın tamamını
bekliyor, sonra tek parça dönüyor. Sonuç: çocuk 5–25 saniye üç noktaya bakıyor,
sonra duvar gibi bir metin beliriyor. Bugün bir LLM arayüzünün "canlı"
hissettiren tek şeyi bu değil ama en büyüğü bu.

**Nasıl.** Yol zaten bu repoda açılmış: `generateAudio` çoktan
`stream: true` + `stream_options: { include_usage: true }` ile SSE okuyor.
Aynı döngü metin için:

```
generateTextStream(messages, model) → AsyncIterable<{delta} | {usage}>
  → route: new ReadableStream, her delta'yı istemciye geçir
  → istemci: fetch().body.getReader(), her chunk'ta setLastAssistant({content: acc})
  → stream bitince: rpc_finalize_generation(gerçek maliyet) + rpc_settle_message(tam metin)
```

**Dikkat edilecekler.**
- Cevher zaten peşin düşüyor, yani akış ortasında kopan bağlantı çocuğun
  cevherini yakmaz — ama `rpc_settle_message` çağrılmazsa transkriptte boş
  asistan satırı kalır. Akış `finally` bloğunda, elde ne varsa onunla
  settle edilmeli.
- `usage` olayı akışın **sonunda** geliyor; gerçek maliyet ancak orada belli
  oluyor. `generateAudio` bunu zaten böyle yapıyor, aynı kalıp.
- Next.js standalone sunucuda proxy tamponlaması akışı öldürebilir:
  `Content-Type: text/event-stream` + `X-Accel-Buffering: no` şart.

**Kazanç:** algılanan hız 5–10×. Tek başına en büyük değişiklik.

## 1.2 Markdown ve kod bloğu render'ı

**Sorun.** `Bubble` cevabı `whitespace-pre-wrap` ile düz metin basıyor
(`playground.tsx:1178` civarı). Model `**kalın**`, `## başlık`, madde
listesi, tablo ya da ` ```python ` yazdığında çocuk ham işaretleri görüyor.
Claude'a "bana Python öğret" diyen bir çocuğun ekranında kod, düz gri metin
olarak çıkıyor.

**Nasıl.** `react-markdown` + `remark-gfm` (tablo, görev listesi) +
kod blokları için `shiki` ya da hafif bir highlighter. Her kod bloğunun
üstünde dil etiketi ve kendi kopyala butonu.

**Güvenlik.** `react-markdown` varsayılan olarak ham HTML'i render etmez;
`rehype-raw` **eklenmeyecek**. Model çıktısı hiçbir zaman
`dangerouslySetInnerHTML`'e gitmez. Çalıştırılabilir tek yer `web`
kategorisinin sandbox'lı iframe'i olarak kalır.

**Ekstra:** matematik için `remark-math` + KaTeX. 10–18 yaş bir üründe
"şu denklemi çöz" çok sık gelecek ve LaTeX'in ham hâli okunmaz.

## 1.3 Dur · yeniden üret · mesajı düzelt

**Sorun.** Başlayan bir üretim durdurulamıyor. Kötü bir cevap geldiğinde tek
çare aynı şeyi elle tekrar yazmak. Bu, bir LLM arayüzünün en temel üç
etkileşimi ve üçü de yok.

**Nasıl (geçmişe dokunmadan).**
- **Dur:** istemcide `AbortController`, sunucuda akışa bağlı `request.signal`.
  Yarım cevap ekranda kalır ve aynen settle edilir — cevher iadesi yok, model
  o işi gerçekten yaptı. Çocuğa "yarıda kestin, ürettiğin kadarı duruyor"
  demek dürüst olan.
- **Yeniden üret:** aynı prompt'u yeni bir tur olarak **ekler**, eski cevabı
  silmez. `rpc_append_turn` zaten append-only; yeni cevher düşer, bu da
  dürüst. Arayüzde iki cevap alt alta "1. deneme / 2. deneme" olarak gösterilir.
- **Mesajı düzelt:** düzeltilmiş hâli yeni bir tur olarak ekler. Gerçek
  dallanma (branch) şema değişikliği ister — kapsam dışı, gerek de yok.

## 1.4 Düşünme (reasoning) görünürlüğü

**Sorun.** Katalogda DeepSeek R1 var ve o bir *akıl yürütme* modeli; Claude
Sonnet 5 de uzun düşünebiliyor. Bugün `generateText` sadece
`choices[0].message.content` okuyor — düşünce zinciri hiç istenmiyor, hiç
gösterilmiyor.

**Neden büyük.** Müfredatın 3. haftası birebir bu: *"Dedektif Günü: Gerçek mi,
Yapay mı? — Halüsinasyonu yakala, açık kaynak modelleri karşılaştır."*
Modelin nasıl düşündüğünü göstermek bu dersin görsel karşılığı. Hiçbir çocuk
ürününde yok; bizde müfredat zaten istiyor.

**Nasıl.** OpenRouter'da `reasoning: { effort }` / `include_reasoning` ile
istenip `delta.reasoning` alanından akıyor. Arayüzde balonun üstünde
katlanmış bir "🧠 Düşünüyor" paneli, akış sırasında açık, cevap gelince
kendiliğinden kapanır. Streaming (1.1) ile birlikte yapılmalı — ayrı ayrı
iki kez aynı yere dokunmak olur.

---

# Katman 2 — Nebula'ya özel, ürünü ayıran şeyler

Katman 1 bizi "iyi bir LLM arayüzü" yapar. Katman 2, başka kimsede olmayanı.

## 2.1 Model düellosu — aynı prompt, iki model, yan yana

**Neden.** `tools.ts`'in başında yazan hedef bu: *"öğrenciler kategori başına
6–7 farklı, gerçek, isimli modeli tanısın."* Bir çocuğa Claude ile GPT'nin
farkını anlatmanın tek gerçek yolu aynı soruya verdikleri iki cevabı yan yana
koymak. Müfredat 3. hafta ("modelleri karşılaştır") ve 2. hafta ("prompt
düellosu") bunu birebir istiyor.

**Şema açısından bedava.** `playground_chat_messages.tool_id` zaten mesaj
başına model tutuyor. Düello = aynı `seq` bloğuna iki asistan satırı, farklı
`tool_id`. `rpc_append_turn`'e ikinci bir asistan satırı açan bir varyant
eklemek yeterli; mevcut çağrı yolu hiç değişmiyor.

**Maliyet.** Cevher n× düşer, `generationOreCost` zaten hazır. Bakiye kapısı
toplam üzerinden kontrol eder. Arayüzde "2 model = 0.1 cevher" açıkça yazar.

**Arayüz.** Composer'da bir "⚔️ Karşılaştır" düğmesi, ikinci modeli seçtiren
küçük bir picker. Cevaplar iki sütun, altında "hangisi daha iyiydi?" oyu —
bu oy hem çocuğu düşündürür hem bize hangi modelin işe yaradığını gösterir.

## 2.2 Rol kartı — sistem prompt'unu çocuğun kendisi yazsın

**Sorun.** `generate/route.ts:16`'da tek bir sabit `SYSTEM_PROMPT` var, herkes
için aynı. Model çocuğun kaçıncı sınıfta olduğunu, neyi sevdiğini, adını
bilmiyor.

**Neden büyük.** Müfredat 2. haftanın konusu birebir *"ROL + GÖREV + BAĞLAM +
FORMAT formülü"*. Bugün çocuk bu formülü öğreniyor ama üründe uygulayacağı
yer yok — sistem prompt'u ona kapalı.

**Öneri, iki parça:**
- **Öğrenci profili** (bir kez): ad, sınıf, ilgi alanları, "bana nasıl
  anlatılsın". Sabit sistem prompt'una eklenir. Ayrı küçük bir tablo
  (`playground_profiles`), sohbet tablolarına dokunmaz.
- **Rol kartları**: çocuğun kaydettiği kendi sistem prompt'ları — "Sen bir
  tarih öğretmenisin, her cevabı bir hikâyeyle başlat". Sohbet başlarken
  seçilir. Kart adı `playground_chats`'e bir sütun **eklemeden**, ayrı bir
  `chat_id → role_card_id` tablosuyla bağlanır (geçmiş şemasına dokunmama
  kuralı).

Bu, "AI ile konuşan çocuk"tan "AI'ı yapılandıran çocuk"a geçiş. Ürünün
eğitim iddiasının kanıtı burada.

## 2.3 Web araması — halüsinasyonun panzehiri

**Sorun.** Model 2024'te ne öğrendiyse onu biliyor. Çocuk "Galatasaray dün kaç
attı" diye sorduğunda emin bir dille uyduruyor. Müfredat halüsinasyonu
öğretiyor; ürün ise halüsinasyon üretiyor.

**Nasıl.** OpenRouter'ın `:online` model son eki ya da `plugins: [{id: "web"}]`.
Cevabın altında kaynak listesi. Cevher fiyatı ayrıca hesaplanmalı (arama
sonucu başına ücret var), ~+0.25 cevher gibi bir sabit ek makul başlangıç.

**Eğitim değeri:** aynı soruyu aramalı ve aramasız sormak, "model bilmiyorsa
uydurur" dersinin en net gösterimi.

## 2.4 Sohbetin içinden görsel üretmek (araç çağrısı)

Bugün kategoriler birbirinden yalıtık: metin sohbetindeyken görsel
üretemiyorsun, model değiştirmen gerekiyor. Gerçek bir asistan öyle
davranmaz.

Claude'a `generate_image` aracını tanımlayıp (tool calling) model istediğinde
mevcut `generateImage` yolunu çağırmak, üretilen görseli aynı balonun altına
koymak. Cevher iki kalemden düşer (metin + görsel), ikisi de zaten fiyatlı.

Bu, listedeki en teknik iş — Katman 1 ve 2.1/2.2 bittikten sonra.

---

# Katman 3 — Görünmeyen borçlar

Bunlar "özellik" değil; yapılmazsa bir gün ısırır.

## 3.1 Öğrenci ekleri hiçbir yere kaydedilmiyor

`docs/playground-chat-persistence.md` §4 bunu planlamış ama uygulanmamış:
`playground-inputs` bucket'ı yok, `generate/route.ts` ekleri hiç yüklemiyor,
`playground_chat_messages`'ta `attachment_paths` sütunu yok.

**İki sonucu var:**
1. Çocuk bir görsel yükleyip sohbet ediyor, sohbeti kapatıp açınca görsel
   yok — devamındaki konuşma anlamsız görünüyor.
2. **Bir çocuğun yüklediği görselin hiçbir kaydı yok.** 10–18 yaş bir üründe
   denetlenebilirlik açısından tek başına yeterli gerekçe.

Persistence dokümanının §5'i (yol→imzalı URL doğrulaması, SSRF'e karşı
`path.startsWith(user.id + "/")` kontrolü) hâlâ geçerli ve doğru; oradaki
tasarım aynen uygulanabilir. **Sütun eklemek geçmiş sistemini değiştirmek
sayılmaz** — mevcut satırlar ve akış aynı kalır — ama yine de en muhafazakâr
yol, ekleri ayrı bir `playground_message_attachments` tablosunda tutmak.

## 3.2 Moderasyon yok

Bugün tek koruma sistem prompt'undaki "güvenli bir dille konuş" cümlesi.
Çocuğun yazdığı da, modelin ürettiği görsel/video de hiçbir filtreden
geçmiyor. Öneri:

- Girdi tarafında ucuz bir sınıflandırıcı (moderation endpoint) — engellenen
  istek cevher yakmaz.
- Riskli çıktılar için admin paneline bir inceleme kuyruğu. `ai_generations`
  zaten her üretimi kaydediyor, üstüne bir `flagged` alanı yeter.
- Öğretmene "bu öğrencinin bu haftaki üretimleri" görünümü.

## 3.3 Bağlam penceresi sessizce kesiliyor

`HISTORY_LIMIT = 20` iki tarafta da sabit. 21. turda sohbetin başı sessizce
düşüyor; çocuk modelin "unuttuğunu" görüyor ama nedenini bilmiyor.

**Öneri:** eski turları ucuz bir modelle (Haiku, ~0.01 cevher) özetleyip
sistem mesajına iliştirmek + composer'da küçük bir "hafıza doluluk" göstergesi.
Hem sorunu çözer hem bağlam penceresi kavramını görünür kılar — yine müfredat
malzemesi.

## 3.4 Video, sekme kapanınca ölüyor

Akış şu an tamamen istemci taraflı: `pollVideoStatus` tarayıcıda dönüyor ve
bittiğinde `/api/playground/chats/settle` çağırıyor. Çocuk sekmeyi kapatırsa
video OpenRouter'da tamamlanır, dosya indirilmez, asistan satırı **sonsuza
kadar boş kalır** — sohbeti açınca boş bir balon görür.

**Çözüm:** `status` route'undaki uzlaştırma mantığını sunucu tarafında da
çalıştıran bir job (pg_cron ya da bir "pending video" süpürücü endpoint).
`ai_generations`'ta `status='pending'` + `openrouter_job_id is not null` olan
satırları tarar. Mevcut kodun neredeyse tamamı yeniden kullanılır.

## 3.5 Eşzamanlılık sınırı yok

Bakiyeden başka fren yok: açık iki sekme ya da bir `for` döngüsü, dakikalar
içinde bütün cevheri yakabilir ve gerçek OpenRouter faturasına yansır.
Kullanıcı başına "aynı anda en fazla 2 bekleyen üretim" kuralı,
`rpc_start_generation` içinde tek bir `count(*) where status='pending'`
kontrolüyle halledilir.

---

# Katman 4 — Ucuz ama etkisi büyük

Hepsi birer öğleden sonralık iş, hiçbiri mimariye dokunmuyor:

- **Sesle yazma (STT).** 10 yaşındaki bir çocuk klavyeyle yavaş. Tarayıcının
  kendi `SpeechRecognition`'ı bedava ve Türkçe destekliyor; yetmezse bir
  transkripsiyon modeli.
- **"Bu görseli düzenle".** Üretilen görselin altında tek düğme, o görseli
  referans olarak composer'a ekler. `input_references` yolu zaten çalışıyor,
  sadece arayüzde kısayol yok — çocuk şu an görseli indirip geri yüklüyor.
- **"Eserlerime kaydet".** `(marketing)/eserler/[kategori]` galerisi zaten var;
  playground çıktısından oraya giden bir yol yok. Öğretmen onayıyla yayın.
- **Prompt yardımcısı.** "Prompt'unu geliştir" düğmesi: ucuz bir model
  çocuğun tek satırını ROL+GÖREV+BAĞLAM+FORMAT'a genişletir, çocuk ikisini
  karşılaştırır. Müfredat 2. hafta, tek düğme.
- **Token/maliyet şeffaflığı.** Balonun altında "bu cevap 320 token, 0.05
  cevher". Cevher ekonomisi zaten var; görünür kılmak hem güven verir hem
  token kavramını öğretir.
- **En alta in düğmesi, klavye kısayolları, tarih ayracı.** Uzun sohbetlerde
  şu an kaybolunuyor.

---

# Önerilen sıra

| # | Paket | İçerik | Neden bu sırada |
|---|---|---|---|
| ~~1~~ | ~~**Akış**~~ | ✅ 1.1 streaming + 1.3 dur + 1.4 düşünme paneli | Yapıldı. |
| ~~2~~ | ~~**Okunabilirlik**~~ | ✅ 1.2 markdown + kod blokları (KaTeX hariç) | Yapıldı. Matematik/KaTeX ayrı bir karar olarak duruyor. |
| 3 | **Borç kapatma** | 3.1 ek kalıcılığı + 3.4 video süpürücü + 3.5 eşzamanlılık | Kullanıcı sayısı artmadan kapatılmalı; sonra kapatmak veri kaybıyla gelir. |
| 4 | **Düello** | 2.1 yan yana karşılaştırma | Ürünü ayıran ilk özellik, şema hazır. |
| 5 | **Rol kartı** | 2.2 profil + sistem prompt'u | Eğitim iddiasının kanıtı. |
| 6 | **Güvenlik** | 3.2 moderasyon + öğretmen görünümü | Öğrenci sayısı ölçeklenmeden önce. |
| 7 | **Araçlar** | 2.3 web arama, 2.4 sohbet içi görsel | En teknik olanlar, en sona. |

1 ve 2 yapıldı. Sıradaki iş **3 — borç kapatma**: ekler kaydedilmiyor
(§3.1), video sekme kapanınca ölüyor (§3.4), eşzamanlılık sınırı yok (§3.5).
Kullanıcı sayısı artmadan kapatılmalı.

**Paket 1–2'nin açık kalan tek doğrulaması:** akış ve markdown tarayıcıda
gerçek bir öğrenci oturumuyla uçtan uca denenmedi — Playground öğrenciye
kapalı ve üretim veritabanında test hesabı açmadım. Sunucu tarafı, parser,
Next'in tamponlamadığı ve markdown render'ı ayrı ayrı doğrulandı; kalan tek
şey birinin tarayıcıda bir mesaj yazması.
