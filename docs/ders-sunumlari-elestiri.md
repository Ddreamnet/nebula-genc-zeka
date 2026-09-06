# Ders sunumları — eleştiri ve Claude Design brief'i

**Tarih:** 5 Eylül 2026
**İncelenen:** `Lessons_slide/Nebula ders sunumları/export/sunumlar/`
· **Deneme Dersi Sunumu** (9 slayt, 30 dk)
· **H01 Ders Sunumu** (13 slayt, 40+10+40 dk)

Her iki deste de tam metniyle, işaretlemesiyle, tipografisiyle, renk
değerleriyle ve görsel varlıklarıyla okundu. Aşağıdakiler dosyadan ölçülen
şeyler — "bence" değil, dosyada ne varsa o.

---

## Önce: bu desteler iyi

Eleştiriye geçmeden, korunması gereken kararlar — çünkü aşağıdaki hiçbir
öneri bunları bozmamalı:

- **Deneme dersinin omurgası doğru.** *İZLE → BİRLİKTE YAP → TEK BAŞINA* bir
  satış dersi için doğru dramaturji: göster, birlikte yap, yalnız bırak.
- **"Aynı yapay zekâ, iki tarif"** karşılaştırması dersin en güçlü anı. Bir
  çocuğa promptun neden önemli olduğunu anlatmanın tek gerçek yolu bu.
- **"Bugün hava çok ___"** boşluk doldurma (H01, slayt 3) desteki tek gerçek
  sınıf etkileşimi ve mükemmel çalışıyor: model kavramını anlatmıyor,
  çocuğa *yaptırıyor*.
- **Difüzyonun heykeltıraş benzetmesi** ("elinde koca bir gürültü taşı var,
  senin kelimelerin keski") 10 yaş için doğru soyutlama seviyesi.
- **Güvenlik Dakikası'nın çerçevesi** — "yükleme yasak" değil, *"tarif
  ettiğinde aynı sonucu alırsın, riski sıfırlarsın"*. Yasak değil, takas
  öneriyor. Doğru olan bu.
- **"PANEL = Orkestra şefi"** cümlesi ürünü tek cümlede konumlandırıyor.
- **`{{ yazarAdi }}` kişiselleştirmesi** — çocuğun adının kitap kapağında
  geçmesi, deneme dersinin en akılda kalıcı 10 saniyesi.

---

## 1. En kritik: desteler Nebula gibi görünmüyor

Bu, listedeki tek "acil" madde. Ötekiler iyileştirme, bu bir marka hatası.

### 1.1 Yazı tipleri markanın değil, ofis programının

Desteler şu üç fontu yüklüyor:

```
Caladea (serif) · Carlito (sans) · IBM Plex Mono
```

**Caladea = Cambria'nın, Carlito = Calibri'nin metrik klonu.** Bunlar
LibreOffice'in Microsoft Office belgelerini bozmadan açmak için kullandığı
yedek fontlar. Yani başlıklar ve gövde metni, bir *Word belgesi* gibi
görünüyor.

Nebula'nın tipografisi (`web/src/app/globals.css`, `landing-theme.ts`):

| Rol | Marka fontu | Destede olan |
|---|---|---|
| Başlık / display | **Fredoka** (yuvarlak, çocuk dostu) | Caladea (serif) ✗ |
| Gövde | **Nunito** | Carlito ✗ |
| Mono / etiket | **IBM Plex Mono** | IBM Plex Mono ✓ |

Üçte ikisi yanlış, ve yanlış olan ikisi en çok göze çarpan ikisi. Sitede
Fredoka'nın yuvarlak, sıcak karakterine alışan bir veli, derste ciddi bir
serif görüyor. **Tek başına bu düzeltme desteleri bir anda "Nebula" yapar.**

### 1.2 Renkler yakın ama hiçbiri birebir değil

Destelerde geçen değerler ve markadaki karşılıkları:

| Destede | Kaç kez | Marka karşılığı | Fark |
|---|---|---|---|
| `#CE6A2C` | 75 | `--amber-deep` **#D2701A** | daha kahverengi/soluk |
| `#E8A46A` | 33 | `--amber` **#FF9F45** | belirgin şekilde daha donuk |
| `#0D1E3A` | 69 | `--space` **#141F3C** | yakın, ama aynı değil |
| `#F4F1EA` / `#FFF6EC` | 21 / 15 | `--paper` **#F7F0E1** | üç farklı krem |
| `#22262E` | 13 | **yok** | markada olmayan bir gri |

Ve daha önemlisi: **markanın beş aksanından üçü destelerde hiç yok.**
Yeşil (`#2FD08A`), pembe (`#FF6B8A`) ve mavi (`#3D5FE0`) hiç geçmiyor.
Desteler tek bir turuncu–lacivert çiftiyle idare ediyor, oysa marka
(ve artık Playground) dört renkli bir sistem.

Somut sonuç: renkler **rol** taşıyamıyor. Bir slaytta "✗ ZAYIF TARİF" ve
"✓ GÜÇLÜ TARİF" var ve ikisi de aynı turuncu ailesinde. Yeşil/pembe elde
olsa doğru–yanlış ayrımı bakar bakmaz okunurdu.

### 1.3 Body arka planı `#22262E`

Her iki destenin `body{background:#22262E}` satırı var — koyu gri. Bu ne
markanın uzay lacivertine (`#141F3C`) ne de kâğıt kremine (`#F7F0E1`) ait.
Projeksiyonda slayt kenarında görünen tek şey bu; yanlış renk.

---

## 2. Zaman çizelgesinde gerçek bir çakışma var

H01'in slaytlarındaki süre etiketleri, sırayla okunduğunda tutmuyor:

| Slayt | Etiket |
|---|---|
| 9 | Güvenlik Dakikası · **33–37 dk** |
| 10 | Avatar Stüdyosu · **LAB · 40 dk** |
| 11 | Tarif kartı · **LAB · 00–15 dk** |
| 12 | Sticker paketi · **LAB · 25–40 dk** |
| 13 | Kapanış · **37–40 dk** |

Slayt 12 laboratuvarın 25–40. dakikasını, slayt 13 ise "37–40" diyor. İki
farklı saat var (teori bloğunun saati ve LAB'ın saati) ve kapanış hangisine
ait belli değil. Öğretmen 40 dakikalık laboratuvarın sonunda "37–40"
yazısını görüyor ve üç dakika geriye mi gitmesi gerektiğini soruyor.

**Çözüm:** tek bir saat. Ya baştan sona dersin toplam dakikası (00–90), ya
da her blokta blok adı + blok içi dakika (`TEORİ 33–37` / `LAB 25–40` /
`KAPANIŞ 87–90`). Şu anki karışım ikisinin arası.

## 2.1 LAB'ın 20 dakikası slaytsız

Laboratuvarın dört adımı var ama üç slaytı:

- Adım 1 (00–05, tarif kartı) → slayt 11 ✓
- **Adım 2 (05–15, ilk avatar turu) → slayt yok**
- **Adım 3 (15–25, stil turu) → slayt yok**
- Adım 4 (25–40, sticker paketi) → slayt 12 ✓

Yani laboratuvarın **ortadaki 20 dakikası** — çocukların en yalnız,
öğretmenin en dağınık olduğu bölüm — ekranda hiçbir şey olmadan geçiyor.
Slayt 10'un görev listesi bu boşluğu doldurmuyor; o brifing, referans değil.

Bu iki slayt yazılırsa, aynı zamanda Playground'un yeni özelliklerinin
gösterileceği yer de orası olur (bkz. bölüm 6).

---

## 3. Deneme dersi kendi sözünü tutmuyor

Slayt 1: **"BUGÜN ANLATMAK YOK, YAPMAK VAR"**. Desteki en yoğun iki slayt
ise hemen ardından geliyor ve ikisi de saf anlatım:

| Slayt | Başlık | Kelime | Blok |
|---|---|---|---|
| 3 | Üç adımda iyi tarif | 92 | **30** |
| 4 | Tarif formülü (4 parça) | **95** | 21 |

İki slayt üst üste 187 kelime referans metni. İlk gerçek etkileşim
("ŞİMDİ SENİN KONUN · SEN SÖYLE") **slayt 5'te**, yani 30 dakikalık dersin
yarısında. Bir çocuk için ilk 12–14 dakika izleme, dinleme ve okumadan
ibaret.

**Öneri:** slayt 3 ve 4'ün yerini değiştirmek yetmez, birini bölmek gerek.
En doğrusu slayt 4'ü (formül) bir **referans kartına** indirip ("BUNU AÇIK
TUT" zaten yazıyor — o hâlde slayt değil, ekranın kenarında duran bir şerit
olmalı) ve slayt 5'i öne almak. Formül, uygulanırken görünür olsun; ayrı bir
slayt olarak okunmasın.

Aynı sorunun H01'deki hâli daha hafif: slayt 7 ("Herkesin sorduğu iki
soru") 110 kelimeyle destenin en yoğunu ve 15–25 dakika penceresini slayt 6
ile (canlı deneme) paylaşıyor. Canlı deneme o pencerenin çoğunu almalı;
110 kelime oraya sığmıyor.

---

## 4. İki deste birbirinden kopuk

Aynı dersin iki parçası gibi değil, iki farklı ürün gibi duruyorlar:

| | Deneme dersi | H01 |
|---|---|---|
| Omurga | İZLE → BİRLİKTE YAP → TEK BAŞINA | (yok — düz akış) |
| Görsel | **0 içerik görseli** | 7 görsel |
| Kişiselleştirme | `{{ yazarAdi }}`, `{{ selam }}` | **yok** |
| Veli özeti | var (son slayt) | **yok** |
| Kelime sözlüğü | yok | var (5 kelime) |

Üç sonucu var:

1. **Satış dersi tamamen tipografik.** Sıfır içerik görseli olan deste,
   veliyi ikna etmesi gereken deste. Bu tersine dönmüş: en görsel deste
   deneme dersi olmalı, çünkü tek gördükleri o.
2. **Veli özeti sadece deneme dersinde.** Oysa velinin ilgisini haftalar
   boyunca canlı tutan şey o. Her hafta 3 maddelik bir "bugün ne oldu"
   slaytı, dönem boyu en ucuz elde tutma aracı.
3. **Kişiselleştirme kayboluyor.** Deneme dersinde çocuğun adı kitap
   kapağında geçiyor, ilk ücretli haftada adı hiç geçmiyor. Duygusal olarak
   geriye gidiş.

**Öneri: bir "deste iskeleti" tanımlansın** ve 16 haftanın hepsi ona uysun:

```
1  Kapak (hafta no, başlık, bugün ne üreteceksin)
2  Bugün ne yapacağız (3 madde, süreleriyle)
3  Ana fikir (tek kavram, tek benzetme)
4  Bu haftanın kelimeleri (5 kelime — H01'deki hâliyle)
5  Canlı deneme (öğretmen ekranda, sınıf söylüyor)
6  Formül / teknik (referans, kısa)
7  Güvenlik notu (her hafta bir cümle, dönen konu)
8  LAB brifingi (adımlar + süreler)
9-12 LAB adım kartları (her adım için bir slayt)
13 Haftanın sorusu (cevherli)
14 Veli özeti (3 madde)
```

---

## 5. Teknik: görseller 12 MB

`assets/` klasörü **12 MB**, yedi görsel için:

| Dosya | Boyut | Ağırlık |
|---|---|---|
| `s01-dif-1.png` | 900×945 | **2.9 MB** |
| `s01-dif-2.png` | 900×945 | **2.8 MB** |
| `s01-dif-3.png` | 900×945 | **2.5 MB** |
| `s01-kapak.png` | 1200×1600 | 1.9 MB |
| `s01-guvenlik.png` | 1100×1200 | 0.6 MB |
| `s01-dif-4.png` | 900×945 | 0.4 MB |
| `s01-tahmin.png` | 1200×1200 | 0.2 MB |

Difüzyon kareleri **gürültü** görselleri — PNG'nin en kötü olduğu içerik
türü, çünkü kayıpsız sıkıştırma rastgele pikselde hiçbir şey kazanamıyor.
Aynı üç kare JPEG (q80) ya da WebP olarak **~120 KB** eder: 25 kat küçük,
projeksiyonda gözle ayırt edilemez fark.

Okul wifi'sinde 12 MB'lık bir deste açmak dersin ilk dakikasını yiyor.
**Öneri:** fotoğrafik görseller WebP/JPEG, uzun kenar 1200 px'e sabit.
Ayrıca `uploads/black.png` (1024×512 düz siyah) desteyle birlikte
gidiyor — artık kullanılmıyorsa temizlensin.

---

## 6. Slaytlar artık var olan düğmelerden bahsedebilir

5 Eylül'de Playground'a eklenenler, H01'in *zaten vaat ettiği* şeylerdi.
Slayt metinleri buna göre güncellenmeli — şu an bir kısmı olmayan bir
düğmeyi, bir kısmı da artık gereksiz olan bir eziyeti tarif ediyor:

| Slayt | Şu an diyor | Artık diyebilir |
|---|---|---|
| LAB Adım 1 (11) | "Kendini yazıyla tarif et… şimdi prompt'a çevir" | **"🎓 Ders → Avatar kartı'nı aç, altı kutuyu doldur — prompt kendiliğinden yazılıyor."** Kart slayttaki formun birebir aynısı. |
| LAB Adım 3 | (slayt yok) | **"🎓 Ders → Stil turu"** — aynı tarifi üç stilde tek düğmeyle üretir. Slaytın istediği tam olarak bu. |
| LAB Adım 4 (12) | "Aracın hazır **arka plan sil** düğmesini kullan" | Düğme artık **gerçekten var** — görselin altında "Arka planı sil". Ekran görüntüsüyle gösterilebilir. |
| LAB Adım 4 (12) | "Aynı avatarı koru, sadece ifadeyi değiştir" | **"🎓 Ders → İfade turu"** — altı ifadeyi sırayla üretir, karakteri sabit tutar. |
| Deneme, slayt 5 | "Her kelime bir düğme · tur 1→4" | **"🎓 Ders → Merdiven"** — tarifi kademelere bölüp dördünü yan yana üretir. Dersin omurgası tek düğme oldu. |
| Güvenlik (9) | "Fotoğraf yükleme yok" | Kural artık **araçta da** var: ilk yükleme denemesinde uyarı çıkıyor. Slayt "araç da seni uyaracak" diyebilir. |

Bu, slaytla ürün arasındaki en büyük kopuğu kapatır: bugün slayt bir şey
söylüyor, ekran başka bir şey gösteriyor.

**Ayrıca eklenebilir:** görselin şeklini seçen düğme (dikey/kare/geniş) —
Hafta 7'nin afiş/logo/kapak dersi bunu isteyecek.

---

## 7. Claude Design'a verilecek brief

Kopyalanabilir hâlde, öncelik sırasıyla:

### Zorunlu (marka)
1. **Fontları değiştir:** Caladea → **Fredoka** (başlık/display),
   Carlito → **Nunito** (gövde). IBM Plex Mono kalsın (etiket/mono).
   Google Fonts: `family=Fredoka:wght@400;500;600&family=Nunito:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600`
2. **Renkleri marka değerlerine sabitle:**
   `--ink #152343` · `--space #141F3C` · `--paper #F7F0E1` ·
   `--amber #FF9F45` / `--amber-deep #D2701A` ·
   `--mint #2FD08A` · `--coral #FF6B8A` · `--blue #3D5FE0`
   `#22262E`, `#CE6A2C`, `#E8A46A`, `#F4F1EA`, `#FFF6EC`, `#0D1E3A` kaldırılsın.
3. **Renklere rol ver:** doğru/olumlu = mint, yanlış/uyarı = coral,
   vurgu/eylem = amber, bilgi/nötr = blue. "✗ zayıf tarif / ✓ güçlü tarif"
   gibi her karşılaştırma bu çiftle boyansın.
4. **Kesme-kâğıt geometrisi:** siteyle aynı dil — düz dolgu, 3px lacivert
   kontur, 6px sert gölge, gradyan yok, blur yok, `--radius-card 22px`.
   Bugün desteler düz kutu; site kesilmiş kâğıt.

### Yapısal
5. **Tek saat.** Her slaytın süre etiketi `BLOK dk–dk` biçiminde
   (`TEORİ 33–37`, `LAB 25–40`, `KAPANIŞ 87–90`). Kapanış çakışması çözülsün.
6. **LAB Adım 2 ve Adım 3 için iki yeni slayt.** Laboratuvarın ortadaki
   20 dakikası ekranda karşılıksız kalmasın.
7. **Deneme dersinde slayt 4'ü (formül) referans şeridine indir**, slayt 5'i
   (etkileşim) öne al. İlk el hareketi 5. slaytta değil, 3. slaytta olsun.
8. **Ortak deste iskeleti** (bölüm 4'teki 14 adımlık liste) ve 16 haftanın
   hepsi ona otursun.

### Tutarlılık
9. **Her haftaya veli özeti** (3 madde, deneme dersindeki biçimde).
10. **Her haftaya `{{ ogrenciAdi }}`** — en az bir slaytta çocuğun adı geçsin.
11. **Deneme dersine görsel gir.** En az: iki tarifin karşılaştırması
    (zayıf/güçlü çıktı yan yana), merdivenin dört karesi, kitap kapağı
    örneği. Şu an sıfır.

### Teknik
12. **Görselleri WebP/JPEG'e çevir**, uzun kenar 1200 px. 12 MB → ~1 MB.
13. `uploads/black.png` gibi artık kullanılmayan varlıkları temizle.

### İçerik
14. **Slayt metinlerini yeni Playground düğmelerine göre güncelle**
    (bölüm 6'daki tablo).
