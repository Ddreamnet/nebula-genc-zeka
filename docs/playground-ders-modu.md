# Playground — ders modu ve profesyonelleşme

**Tarih:** 4 Eylül 2026 · **Güncellendi:** 5 Eylül 2026
**Durum:** 0.1, 0.2, 1.1, 1.2, 1.3 ve en-boy oranı **uygulandı**;
0.5 (yükleme uyarısı) denendi ve kaldırıldı; gerisi öneri

Bu doküman iki soruya cevap veriyor:

1. **Playground derste nasıl aktif kullanılan bir araç olur?** —
   `Lessons_slide/Nebula ders sunumları/` altındaki iki sunum
   (**Deneme Dersi**, 30 dk · **Hafta 01**, 40+10+40 dk) baştan sona okunarak,
   slaytların ürüne bıraktığı somut ihtiyaçlardan çıkarıldı.
2. **Bu araç nereye kadar profesyonelleşebilir?** — video/ses/site tarafında
   gerçekçi tavanın nerede olduğu.

Yol haritasının teknik katmanları `docs/playground-roadmap.md`'de duruyor ve
hâlâ geçerli. Bu doküman onun yerine geçmiyor; ona **dersin** ne istediğini
ekliyor. Çakışan yerlerde ders kazanır — çünkü ürünün müşterisi ders.

---

## 0. Önce şu: slaytlar üründe olmayan şeyler vaat ediyor

Bunlar "iyi olurdu" değil, **öğretmen ekranda gösterip bulamayacak** şeyler.
Sırası en acil olandan.

### 0.1 "Arka planı temizle. Aracın hazır **arka plan sil** düğmesini kullan."

Hafta 1, LAB Adım 4, teslim slaytı. Böyle bir düğme yok. Sticker paketi
derse sığmıyor: çocuk 12 görsel üretiyor, hiçbirinin arka planı temiz değil,
WhatsApp'a eklenemiyor — dersin **teslim edilebilir tek ürünü** bu.

**✅ Uygulandı (5 Eylül).** Üçüncü bir yolla: `lib/playground/cutout.ts`,
kenardan içeri doğru **flood fill**. Hazır paketler (`@imgly/background-removal`,
RMBG-1.4) ya 5–40MB indirme ya da ticari üründe kullanılamayacak lisans
demekti — ve bizim problemimizden çok daha zorunu çözüyorlar. Bu düğmeye
gelen her prompt dersin kendi şablonundan çıkıyor ve *"sade arka plan" /
"tamamen düz ve tek renk arka plan"* ile bitiyor: arka plan kenara değen düz
bir alan. Onun için kenar flood fill hem daha küçük hem daha isabetli.

Düz renk yerine **bağlantılı** alan silinmesi bilinçli: düz renk anahtarı
olsaydı karakterin arka planla aynı renkteki yerlerini de delerdi — dersin
kendi *"kalın beyaz kenarlık"* talimatı bunu neredeyse garanti ediyordu.
Kenarda yarım alfa geçişi de var, yoksa sticker WhatsApp'ta bir piksellik
kirli hâle ile çıkıyordu.

Dürüstlük payı: fotoğrafta ya da arka planı degrade/sahne olan bir görselde
bunun bir kısmını siler. Bu yüzden sonuç **dama zeminde** gösteriliyor
(çocuk ne aldığını görüyor) ve silinen oran %5'in altında veya %90'ın
üstündeyse arayüz açıkça "olmadı" diyor.

### 0.2 "Aynı avatarı koru, sadece **ifadeyi** değiştir."

Aynı slayt. Bugüne kadar imkânsızdı — görsel modelleri tek atışlıktı.
**Bu iş yapıldı** (composer'daki `Hafıza` anahtarı): son üretilen görsel
referans olarak sonraki üretime giriyor. Sticker paketi artık mümkün.

Eksik kalan: paket **altı ifade** istiyor (gülen, şaşkın, uykulu, kızgın,
kalpli, baş parmak) ve bugün bu altı ayrı mesaj. Bkz. 1.2.

### 0.3 "Ev görevi: Avatarını ve sticker paketini **panele yükle**."

Playground çıktısından panele/eserlere giden yol yok. Çocuk görseli indirip
bir daha nereye koyacağını bilmiyor. Bkz. 1.6.

### 0.4 "Haftanın sorusu · **panelde kredi ödüllü**"

Hafta 1 kapanışı, üç seçenekli bir oylama ("Bence aynı olur / Bence farklı
olur / Çünkü…") ve ödülü cevher. Panelde ne soru var ne oylama ne de
ödüllendirme yolu. Bkz. 1.7.

### 0.5 "**Fotoğraf yükleme yok.** Tarif et."

Hafta 1'in Güvenlik Dakikası bunu dönemin en önemli kuralı ilan ediyor.
Composer'da ise görsel ekleme düğmesi duruyor ve hiçbir uyarı vermiyor.
Çelişki öğretmenin aleyhine: kural slaytta, düğme ekranda.

**Karar: arayüzde uyarı yok (5 Eylül).** 5 Eylül'de composer'a tek seferlik
bir uyarı kartı eklendi ve aynı gün Fatih'in kararıyla **tamamen kaldırıldı**.
Kural slaytta kalıyor, öğretmen söylüyor; araç sessiz.

Yani bu madde ürün tarafında **kapalı değil, kapsam dışı**. Slayt ile ekran
arasındaki çelişki duruyor ve bilinçli duruyor. Tekrar açılmak istenirse iki
yol var, ikisi de öğretmen paneli gerektiriyor: hafta bazlı yükleme kilidi
(1–5. haftalarda düğme hiç görünmez) ya da sınıf başına açılıp kapanan bir
ayar. Ders içinde uyarı metni göstermek denendi ve istenmedi.

---

## 1. Derste işe yarayacak özellikler — öncelik sırasıyla

Her madde slayttaki hangi ana denk geldiğiyle birlikte. Tahmini iş yükü
gerçekçi: "öğleden sonra" = tek oturum, "gün" = 1–2 gün.

### 1.1 Tarif Kartı — slaytın doldurulabilir hâli ⭐ en yüksek etki

Hafta 1, LAB Adım 1–2 slaytı zaten bir form: **SAÇ · GÖZLÜK · KIYAFET ·
RENK · İFADE · STİL**, altında da kalıbı: `[saç], [gözlük], [kıyafet] olan
[ifade] bir karakter; karikatür avatar, büyük gözler, kalın beyaz kenarlık,
sade arka plan, sticker tarzı.`

Bugün çocuk bunu kâğıda yazıp klavyeye geçiriyor — 10 yaşındaki bir çocuk
için dersin en yavaş 8 dakikası. Composer'ın üstünde altı kutucuk olsa,
doldurdukça prompt aşağıda **canlı yazılsa**, o 8 dakika 90 saniyeye iner.

Asıl kazanç hız değil: çocuk promptun **parçalardan** oluştuğunu görüyor.
Deneme dersinin "4 parça: ÖZNE + SAHNE + STİL + TEKNİK" ve Hafta 1'in
"4 sihirli kelime grubu: STİL + IŞIK + AÇI + DUYGU" formülleri birebir bu.

**✅ Uygulandı ve genişletildi (5 Eylül)** — `lib/playground/prompt-cards.ts`,
**15 kart · 123 alan · 495 seçenek çipi**, her modalitede:

| Araç | Kartlar |
|---|---|
| Görsel | Avatar · Sahne · Afiş & kapak · Logo · Karakter sayfası |
| Video | **Sinematik çekim** (18 alan) · Karakterini canlandır · Tanıtım |
| Metin | ROL+GÖREV+BAĞLAM+FORMAT · Hikâye · Ödev yardımcısı |
| Web & oyun | Web sitesi · Oyun |
| Müzik & ses | Şarkı · Seslendirme |

Üç tasarım kararı:

**Çipler bir menü değil, bir sözlük.** Her çip mesleğin gerçek terimi —
"dolly in", "85mm portre", "altın saat", "arpej gitar", "chiaroscuro". Altı
çipe dokunan çocuk bir profesyonelin tanıyacağı bir prompt yazmış oluyor ve
altı kelimeyle tanışıyor. Belirsiz sıfat listesi olsaydı kartı yazmaya
değmezdi.

**İsteğe bağlı alanlar boşken tarife hiç girmiyor.** Zorunlu alan
placeholder'ına düşüyor (yarım dolu kart bile çalışan bir tarif üretiyor),
isteğe bağlı olan yok oluyor. Bu ayrım olmasaydı sinematik kartın 18 alanı
her prompta 18 madde sokardı ve çocuğun kendi fikri seçmediği varsayılanların
altında kalırdı.

**Gelişmiş gruplar kapalı açılıyor.** Sinematik kart üç kutuyla açılıyor,
aynı kartta on sekiz tane var. Aynı kart, iki seviye, ikinci bir arayüz yok.

Kartlar göndermiyor, composer'a yazıyor; çocuk hâlâ bir kelime değiştirip
kendi gönderiyor — ve merdivene verip hangi alanın ne yaptığını görebiliyor.

### 1.2 Varyasyon turu — "aynı tarif, N çıktı" ⭐

Hafta 1 LAB Adım 2 *"2–3 çıktı üret"*, Adım 3 *"aynı tarifi **3 stilde**
üret: karikatür, piksel-art, 3D"*, Adım 4 *"farklı **ifadeler** üret"*.
Üçü de aynı şey: bir prompt, birkaç çıktı, yan yana.

Bugün bu 3–6 ayrı mesaj, 3–6 ayrı bekleme, ve sonuçlar transkriptte alt
alta dağılmış — karşılaştırılamıyor.

**✅ Uygulandı (5 Eylül)** — "Stil turu" (karikatür · piksel-art · 3D render)
ve "İfade turu" (slayttaki altı ifade) olarak. Paralel değil **sıraya
dizili**: ilk üretim sohbeti açıyor (diğerlerinin ineceği yer o), sunucu
öğrenci başına eşzamanlı üretimi sınırlıyor, ve on iki kişilik bir sınıfın
altışar paralel iş açması kimsenin planlamadığı bir fatura.

Her adım sıradan bir tur — aynı uç nokta, aynı cevher muhasebesi, aynı iade
yolu — yani yeni bir sunucu yüzeyi yok ve transkript bütün alıştırmayı sırayla
gösteriyor, ki öğretmenin işaret ettiği şey tam olarak o.

İfade turunda referans, **her adımda aynı temel avatar**. Her adımı bir
öncekine zincirlemek bedava olurdu (hafıza anahtarı zaten onu yapıyor) ama
altı zincirli düzenleme kayar — slaytın *"paket bir aileye benzesin"*
uyarısı tam olarak bunu diyor.

### 1.3 Prompt Merdiveni — deneme dersinin omurgası ⭐

Deneme dersi baştan sona bu: *"bir ejderha"* → *"origamiden bir ejderha"* →
*"…neon ışıklı bir şehirde"* → *"…film afişi stilinde"*. Her turda **tek**
kelime ekleniyor ve fark izleniyor. Kitap kapağı örneği de aynı: 4 adımda
"bir kitap kapağı"dan gerçek bir teknik prompta.

**✅ Uygulandı (5 Eylül).** Tek düğme — "Merdiven". Çocuk bitmiş tarifini
yazar (ya da tarif kartıyla ürettirir), araç onu virgüllerinden 4 kademeye
**böler** ve dört üretimi sırayla transkripte dizer. Model çağırmadan, sadece
metin işleyerek — dört kademeyi elle yazdırmak yerine bitmiş olanı sökerek.
Tarif kartıyla zincirlenmesi bu yüzden: kartı doldur, merdivene ver, hangi
alanın ne yaptığını gör.

Turlar **hafızadan bağımsız** çalışıyor (`memoryOverride: false`). Hafıza
açıkken her adım bir öncekinin görselini referans alır ve merdivenin bütün
anlamı — "şu tek kelime neyi değiştirdi" — kaybolurdu.

### 1.4 Model düellosu — aynı prompt, iki model yan yana

Yol haritası 2.1'de zaten var; müfredat Hafta 3 ("modelleri karşılaştır")
ve Hafta 2 ("prompt düellosu") istiyor. Slaytlarda doğrudan bir sahnesi
yok ama Hafta 1'in *"PANEL = Orkestra şefi. Tek arayüzden farklı
enstrümanları çağırıyoruz"* cümlesinin **kanıtı** bu: iki enstrümanı aynı
anda çaldırmak.

Şema hazır (`playground_chat_messages.tool_id` mesaj başına model tutuyor).
**~1–2 gün.**

### 1.5 "İki kere çalıştır" — haftanın sorusunun cevabı

Hafta 1'in kapanış sorusu birebir: *"Aynı promptu bir görsel modeline iki
kez versek, tıpatıp aynı resmi mi verir? Neden?"* Slayt cevabı da veriyor:
başlangıç gürültüsü her seferinde rastgele.

Bunu **anlatmak** yerine göstermek bir düğme: aynı promptu iki kez çalıştır,
iki sonucu yan yana koy. 1.2'nin (N varyasyon) özel hâli — ayrıca
kodlanması gerekmiyor, sadece o düğmenin adı ve ders içindeki yeri.
**Bedava, 1.2 yapılırsa.**

### 1.6 "Eserlerime kaydet" — ev görevinin karşılığı

`(marketing)/eserler/[kategori]` galerisi zaten var; Playground'dan oraya
giden yol yok. Balonun altında tek düğme: **Eserlerime ekle** → öğretmen
onayı → galeride yayın.

Ev görevi slaytı ("panele yükle") bunu istiyor, ve dönem sonundaki
"kendi dergin / portfolyo" vaadi de bunun üstüne kuruluyor. **~1 gün**
(onay kuyruğu admin panelinde, yol haritası 3.2'yle aynı yere oturuyor).

### 1.7 Haftanın sorusu — panelde, cevherli

Hafta 1'in kapanışı. Panele haftalık bir soru kartı: metin, 2–3 seçenek,
bir de "Çünkü…" kutusu. Doğru/katılım cevheri otomatik yatar
(`rpc_admin_grant_playground_ore` zaten var).

Yan faydası büyük: öğretmen kimin katıldığını görüyor, ve çocuk için
cevherin **kazanılabilir** olduğu ortaya çıkıyor — bugün cevher yalnızca
harcanan bir şey. **~1–2 gün** (küçük bir tablo + panelde kart).

### 1.8 Sözlük — 5 kelime, tıklanabilir

Hafta 1'in *"model · prompt · üretim · stil · difüzyon"* slaytı ve her
haftanın kendi kelimeleri. Playground'da bu kelimeler zaten geçiyor
(cevher, model, prompt) ama hiçbiri açıklanmıyor.

**Nasıl:** `curriculum.ts`'in yanına haftalık kelime listesi, arayüzde
başlık altında ince bir şerit. Ucuz, ve müfredatın "her hafta 5 kelime"
sözünü üründe görünür kılıyor. **~yarım gün.**

### 1.9 Ders modu — öğretmenin ekranı

Slaytların LAB bölümü dakika dakika yazılmış (00–05 tarif kartı, 05–15 ilk
tur, 15–25 stil turu, 25–40 sticker). Öğretmen bunu ayrı bir ekranda
takip ediyor.

**Nasıl:** Playground'a `?ders=1` ile açılan ince bir üst şerit: bu
haftanın adımları, her adımın süresi, hangisindeyiz. Öğretmen başlatıyor,
çocuk aynı şeridi görüyor. Zamanlayıcı değil — **konum göstergesi**;
sınıfta "hangi adımdayız" sorusu dakikada bir soruluyor.

Bir üst seviyesi: öğretmenin bütün sınıfın üretimlerini tek ekranda
gördüğü canlı bir duvar. Değerli ama ayrı bir iş (gerçek zamanlı abonelik,
ayrı yetki) — **bu dönem için değil.**

### 1.10 Sınır koyma (negatif prompt)

Deneme dersinin "3 usta hareketi"nden biri: *"İstemediğini de söyle —
üzerinde yazı olmasın, sadece iki renk kullan"*. Composer'da ikinci,
küçük bir satır: **"olmasın:"**. Prompta `--no ...` yerine düz cümle olarak
ekleniyor. **~yarım gün.**

### 1.11 Medya görüntüleyici ⭐

**✅ Uygulandı (5 Eylül).** Transkript medyayı bilerek küçük tutuyor (96
yükseklikte bir kart) ki sohbet sohbet gibi okunsun — ama üretilen görsel,
klip ya da site **ürünün kendisi** ve küçük resimde değerlendirilemez.

Artık görsele tıklayınca, videonun köşesindeki düğmeye (video için tıklama
oynat/duraklat demek) ya da site önizlemesinin büyüt düğmesine basınca tam
ekran açılıyor: aynı kesme-kâğıt kabuğu, tek ve belirgin bir **İndir**
düğmesi, sitede ayrıca "kodu kopyala".

İndirme gerçekten indiriyor: düz bir `<a download>` çapraz kaynakta yok
sayılır — tarayıcı imzalı depolama adresine *gider*, telefonda görsel bir
sekmede açılır ve çocuk uzun basmak zorunda kalır. Önce blob'a çekmek, hem
ismi hem kaydetmeyi tutturan şey. CORS reddedilirse yeni sekmede açmaya
düşüyor: sekme indirmekten kötü ama hiçbir şey yapmayan bir düğmeden çok
daha iyi.

---

## 2. Panel ne kadar profesyonel olabilir? Gerçekçi tavan

Kısa cevap: **tek atışlık üretim tarafında sonuna kadar profesyonel
olabiliriz. Zaman çizelgesi (montaj/miks) tarafında olamayız — ve
olmamalıyız.**

Uzun cevabı modalite modalite:

### Metin — bugün zaten profesyonel, üç şey eksik

Akış, markdown, kod blokları, düşünme paneli ve durdurma var; bu, ChatGPT
arayüzünün gerçekten önemli kısmı. Eksikler: **yeniden üret**, **mesajı
düzelt** (ikisi de yol haritası 1.3'te, append-only olarak tasarlanmış) ve
**web araması** (2.3). Üçü de birkaç günlük iş ve üçü de "gerçek bir
asistan" hissini tamamlıyor. Tavan yok — burada istediğimiz kadar
ilerleyebiliriz.

### Görsel — asıl fırsat burada

Bugün eksik olan ve **kolay** olanlar:

- **En-boy oranı seçici.** `openrouter.ts` içinde `ASPECT_RATIO` tek bir
  sabit. Afiş dikey, kapak kare, banner geniş — Hafta 7 ("kullanılabilir
  bir afiş/logo/kapak tasarla") bunu doğrudan istiyor. **Yarım gün.**
- **N varyasyon** (1.2) ve **hafıza ile düzenleme** (yapıldı).
- **Arka plan silme** (0.1), tarayıcıda, bedava.
- **Büyütme (upscale).** Sticker ve afiş için gerçek fayda; OpenRouter
  kataloğunda karşılığı varsa tek çağrı.

**Zor** olan: maskeyle bölgesel düzenleme (inpainting) — gerçek bir fırça
arayüzü demek, ve 10 yaşındaki bir çocuk için faydası şüpheli. Sınırın
dışında bırakılabilir; "aynısı olsun ama gece" cümlesi zaten hafızayla
çalışıyor ve pedagojik olarak daha doğru (çocuk **tarif etmeyi** öğreniyor,
fotoshop öğrenmiyor).

**Tavan:** görsel tarafında profesyonel bir panelden farkımız kalmaz.

### Video — tavan burada, ve alçak

Bugün: prompt → 4–10 sn klip, isteğe bağlı ilk kare. Hafıza anahtarıyla
artık "ürettiğin görseli oynat" da mümkün.

Bir sonraki adım (**yapılabilir**): **storyboard**. Çocuk 3–5 sahneyi
yazar, her sahne bir klip olur, ekranda sırayla dizilir, tek tek indirilir.
Hafta 9 ("sahneleri üret, sinematik bir mini filme dönüştür") tam olarak
bunu istiyor. Karakter tutarlılığı da hafızayla geliyor: her sahne bir
öncekinin son karesinden değil ama aynı referans görselden başlar.

Bunun **ötesi** (birleştirme, geçiş, müzik altına serme, altyazı) sunucuda
`ffmpeg` demek: ayrı bir işlem kuyruğu, dakikalarca CPU, GoDaddy'nin
paylaşımlı ortamında büyük risk, ve ayrı bir zaman çizelgesi arayüzü.
**Öneri: yapmayalım.** Klipleri indirip CapCut'ta birleştirmek dersin
zaten öğretmeye değer bir parçası — ve "yapay zeka her şeyi yapmaz, sen
kurgularsın" mesajı müfredata uygun.

**Tavan cümlesi:** Nebula bir **klip fabrikası** olabilir; bir **montaj
masası** olmamalı.

### Ses ve müzik — video ile aynı sınır

Lyria/ElevenLabs tek atışta çalışıyor. Şarkı üretmek, seslendirme yapmak,
ikisini de indirmek mümkün. **Miksleme** (sesi müziğin üstüne koymak,
seviye ayarı) yine ffmpeg — aynı gerekçeyle dışarıda. Hafta 12 "filmine
fon yap" diyor; fon müziğini üretmek bizde, filme koymak CapCut'ta.

### Web ve oyun — en profesyonelleşebilir alan

Bugün: tek HTML dosyası, sandbox'lı önizleme, indirme. Bu zaten iyi.
Eksikler ve hepsi **yapılabilir**:

- **Üstüne konuşarak geliştirme.** Şu an her mesaj sıfırdan bir site
  üretiyor; hafıza anahtarı metin tarafında bunu düzeltiyor ama sistem
  promptu hâlâ "sıfırdan üret" diyor. "Butonu yeşil yap" demek yetmeli.
  **Yarım gün** (sistem promptuna "önceki kodu koru, sadece isteneni
  değiştir" + son kodu bağlama koymak).
- **Sürümler.** Her üretim bir sürüm, geri dönebilme. Hafta 10–11 iki
  haftaya yayılmış bir proje — bugün ikinci hafta baştan başlıyor.
- **Gerçek yayın.** Hafta 11 *"yayınla"* diyor. Bir alt alan adı altında
  statik barındırma (`ogrenci.nebulagenczeka.com/ali`) — Supabase Storage
  + bir yönlendirme ile çözülür. Çocuğun ailesine gönderebileceği bir link,
  dönemin en somut çıktısı.

**Tavan:** yok. Burası dönemin en gösterişli ve en ucuz alanı.

---

## 3. Yapılamayacaklar (ve dersin bunları istememesi lazım)

Slaytlarda geçen ama üründe karşılığı **olmayacak** iki şey:

- **Difüzyon adımlarını canlı izlemek** (Hafta 1'in ADIM 0/10/20/30
  slaytı). OpenRouter ara adımları döndürmüyor; hiçbir sağlayıcı da
  standart olarak vermiyor. Slayttaki dört kare zaten hazır görsel —
  öyle kalsın, üründe canlandırmaya çalışmayalım.
- **Sınıfın canlı duvarı** (herkesin üretimi tek ekranda, gerçek zamanlı).
  Teknik olarak mümkün ama bu dönemin işi değil.

---

## 4. Önerilen sıra

Ders takvimi gözeterek, "hangi hafta ne lazım" mantığıyla:

| # | İş | Neden bu sırada | Durum |
|---|---|---|---|
| ~~1~~ | ~~**Arka plan silme** (0.1)~~ | Hafta 1'in teslim ürünü buna bağlıydı | ✅ 5 Eylül |
| ~~2~~ | ~~**Stil / ifade turu** (1.2)~~ | Hafta 1 LAB'ın 3 adımı da bunu istiyordu | ✅ 5 Eylül |
| ~~3~~ | ~~**Tarif kartı** (1.1)~~ | Deneme dersi + Hafta 1'in omurgası | ✅ 5 Eylül |
| ~~4~~ | ~~**Prompt merdiveni** (1.3)~~ | Deneme dersinin tamamı | ✅ 5 Eylül |
| ~~5~~ | ~~**En-boy oranı**~~ | Hafta 7 afiş/logo/kapak istiyor | ✅ 5 Eylül |
| 6 | **Eserlerime kaydet** (1.6) | Ev görevi bunu istiyor, portfolyo vaadi buna dayanıyor | ~1 gün |
| 7 | **Haftanın sorusu** (1.7) | Cevheri kazanılabilir yapıyor | ~2 gün |
| 8 | **Web: üstüne geliştirme + sürümler** | Hafta 10–11 gelmeden | ~2 gün |
| 9 | **Model düellosu** (1.4) | Hafta 2–3 | ~2 gün |
| 10 | **Sözlük** (1.8) + **ders modu şeridi** (1.9) | Öğretmen ekranı | ~2 gün |
| 11 | **Video storyboard** | Hafta 9 gelmeden | ~2–3 gün |

Yol haritasının "borç kapatma" paketi (ek kalıcılığı, video süpürücü,
eşzamanlılık sınırı) bu listeye paralel duruyor ve **öncelikli** — ama
o kodun bir kısmı yazılmış, sadece migration'ları veritabanına
uygulanmamış görünüyor (bkz. aşağıdaki not).

---

## Not: migration durumu (5 Eylül 2026)

`20260904232950_teacher_playground_no_ore_limit` canlıya **uygulandı**.
`rpc_start_generation`'ın tamamını yeniden yazıyor ve yazılmış ama hiç
uygulanmamış iki migration'ın (`20260828120000` admin muafiyeti,
`20260830090000` eşzamanlılık freni) etkisini de içine alıyor — o iki dosya
artık gereksiz. Canlı davranış: öğretmen ve admin cüzdan kapısına takılmıyor,
herkes (personel dahil) 15 dakikalık pencerede en fazla 3 bekleyen üretimle
sınırlı.

**Hâlâ açık:** `20260830093000_playground_input_attachments.sql` uygulanmadı.
`playground_generation_inputs` tablosu canlıda yok, dolayısıyla:

- Öğrencinin yüklediği görseller hiçbir yere kaydedilmiyor; eski bir sohbeti
  açınca ek kayboluyor (yol haritası 3.1 hâlâ açık) ve denetim kaydı yok.
- `generate/route.ts` içindeki `loadPreviousTurnInputs` var olmayan bir
  tabloyu sorguluyor — hata yutuluyor, sessizce boş dönüyor. `tsc --noEmit`
  bu yüzden üç hata veriyor; ağacın geri kalanı temiz.

**Ters yönde de kayma var:** canlıda `20260902213349 site_cms_tables` var ama
yerelde dosyası yok. Herhangi bir `db push` öncesi `supabase migration fetch`
gerekiyor.

Yeni eklenen **hafıza anahtarı ve ders turları bunlardan etkilenmiyor**:
yalnızca `playground_chat_messages` ve `playground-outputs` kovasını
kullanıyorlar, ikisi de canlıda mevcut.
