# Nebula Genç Zeka — Kâğıt Uzay marka kiti

Instagram tasarımları ve Claude Design için. Amaç siteyi kopyalamak değil;
aynı dünyada geçtiği anlaşılsın ama post kendi tasarımı olsun.

---

## Klasörde ne var

```
brand-kit/
  svg/            15 parça, vektör — Claude Design ve Figma için
  png/            aynı 15 parça, 1600px, şeffaf zemin — Canva ve mobil için
  build.mjs       üretici script (node brand-kit/build.mjs)
  BRAND.md        bu dosya
```

Kaset (karakterler):

| Dosya | Ne zaman |
|---|---|
| `nova-float` | Varsayılan. Süzülüyor, kollar iki yana açık. Duyuru ve kapak postları. |
| `nova-wave` | El sallıyor. Karşılama, "merhaba", yeni dönem duyurusu. |
| `nova-cheer` | İki kol havada. Kutlama, öğrenci işi paylaşımı, başarı. |
| `nova-point` | Sağı gösteriyor. Bir şeye dikkat çekerken, carousel'de "kaydır". |
| `nova-think` | Elini çenesine götürmüş. Soru sorarken, "biliyor muydun" postları. |
| `nova-float-mint` | Gözleri mint. Yeşil ağırlıklı postlarda Nova'yı yeniden anahtarlar. |
| `bit-blue` | Nova'nın yardımcısı, tek gözlü küp drone. Konu "makine"yse. |

Sahne parçaları: `star-amber`, `star-mint`, `star-coral`, `star-blue`,
`planet-violet`, `planet-coral`, `comet-mint`, `rocket`.

---

## Claude Design'a nasıl verilir

Üç yol var, en kolayından zora:

1. **Dosya yolu ver.** Bu repoda çalışıyorsan: "Nova'yı
   `brand-kit/svg/nova-wave.svg` dosyasından al, artboard'a göm."
2. **SVG kodunu yapıştır.** `.svg` dosyasını aç, içindekini kopyala,
   prompt'a yapıştır. Claude Design inline SVG'yi olduğu gibi kullanır.
   En güvenilir yol — hiçbir şey bozulmaz.
3. **PNG yükle.** `png/` klasöründeki dosyayı sürükle. Şeffaf zeminli,
   1600px. Vektör esnekliği yok ama Canva gibi araçlar için gerekiyor.

Aşağıdaki "Hazır brief" bölümünü olduğu gibi kopyalayıp prompt'un başına
koyabilirsin.

---

## Kilitli — birebir uyulacak

Bunlar değişirse post Nebula'nın postu olmaktan çıkar.

### Nova'nın karakter kuralları

- **Vizör opak. İçinde yüz yok.** Sadece iki amber ışık ve bir yıldız
  yansıması. Ağız çizme, kaş ekleme, göz bebeği koyma. Bütün ifade o iki
  ışığın şeklinden geliyor — Nova bu yüzden kimseye benzemiyor.
- **Vizördeki dört köşeli beyaz yıldız Nova'nın imzası.** Hep sağ üstte,
  hep orada.
- Her şekil aynı kalınlıkta lacivert konturlu. Gradyan yok, yumuşak gölge
  yok, blur yok. Kâğıttan kesilip üst üste konmuş gibi.
- Kollar ve bacaklar tüp: lacivert kalın çizgi + üstüne krem ince çizgi.
  Bilekte amber manşet, ucunda krem eldiven.
- Göğüs panelindeki iki nokta (mint + amber) hep durur. Ambere niyetli
  görünümünü veren şey oradaki mint.

### Palet

| Rol | Hex | Not |
|---|---|---|
| Kâğıt (zemin) | `#F7F0E1` | Sıcak krem. Postların yarısı bu zeminde. |
| Kâğıt, kabartılmış | `#FFFBF2` | Kart yüzeyi. |
| Kâğıt, çukur | `#EDE3CF` | Bir kademe geri duran alanlar. |
| Uzay (zemin) | `#141F3C` | Koyu postlar. Nova en iyi burada okunuyor. |
| Uzay, derin | `#0B1226` | Gölge ve kontrast. |
| Mürekkep | `#152343` | **Bütün konturlar ve gölgeler bu.** Asla saf siyah. |
| Mürekkep, yumuşak | `#5B6480` | İkincil metin. |
| Krem üstü metin | `#F2ECDD` | Koyu zeminde başlık. |
| Amber | `#FF9F45` / koyu `#D2701A` | Ana vurgu. Nova'nın gözleri, botları. |
| Mavi | `#3D5FE0` / koyu `#2437A6` | Birincil buton, Bit'in gövdesi. |
| Mint | `#2FD08A` / koyu `#17915B` | Onay, "tamam", ikinci vurgu. |
| Mercan | `#FF6B8A` / koyu `#CE3B5F` | Uyarı, dikkat, roket kanadı. |
| Menekşe | `#8B6BFF` / koyu `#5D3FD1` | Gezegen, yaratıcı konular. |

Her ana rengin bir `-deep` eşi var ve **o eş sadece sert gölge olarak
kullanılıyor** — blur yok, offset gölge. Bütün renkli yüzeyler aynı fizikle
kalkıyor ve basılıyor.

### Kesme-kâğıt fiziği

```
kontur:  3px  (küçük parçalarda 2.5px), rengi #152343
gölge:   6px 6px 0  — blur YOK, rengi #152343 ya da parçanın -deep rengi
köşe:    kart 22px · buton/kutu 16px · çip 999px
```

### Tipografi

- Başlık: **Fredoka** (500/600/700). Yuvarlak, çocuksu ama okunaklı.
- Metin: **Nunito** (400/600/700/800).
- Etiket, rakam, küçük büyük harf: **IBM Plex Mono**, harf aralığı `.14em`,
  hep büyük harf.

Üçü de Google Fonts'ta ücretsiz.

---

## Serbest — uyumlu olsun, aynı olmasın

Instagram postu siteyle aynı görünmek zorunda değil. Bunlarda özgürsün:

- **Kompozisyon.** Sitede her şey hizalı bir grid. Postta Nova'yı kadraja
  taşırabilirsin, kesebilirsin, dev yapabilirsin.
- **Punto ölçeği.** Postta başlıklar sitedekinden çok daha büyük olmalı;
  telefonda akışta kayarken 3 metreden okunur gibi görünmesi lazım.
- **Arka plan.** Site iki zeminde kalıyor (krem ve lacivert). Post için
  paletteki herhangi bir rengi tam zemin yapabilirsin — menekşe zemin,
  mercan zemin. Kontur ve gölge lacivert kaldığı sürece tutar.
- **Yeni şekiller.** Palet ve kontur kuralına uyan yeni parçalar
  çizebilirsin: uydu, kuyruklu yıldız kümesi, konuşma balonu, çerçeve.
- **Doku.** Sitede yok ama postta hafif bir kâğıt dokusu ya da noktalı
  raster iyi durur.

---

## Yapılmayacaklar

- Gradyan. Hiçbir yerde.
- Yumuşak/blurlu gölge. Gölge her zaman sert ve offset.
- Nova'nın vizörüne yüz çizmek.
- Saf siyah (`#000`) ya da saf beyaz (`#FFF`) geniş alan olarak. Kontur
  `#152343`, beyaz alan `#FFFBF2`.
- Stok astronot görseli. Nova varken başka astronot kullanılmaz.
- Emoji. Yıldız gerekiyorsa `star-*.svg` var.
- Nova'yı esnetmek. Orantı sabit; büyüt küçült ama deforme etme.

---

## Instagram pratik notlar

- Post ölçüsü **1080 × 1350** (4:5) — akışta en çok yer kaplayan oran.
  Story ve reels kapağı 1080 × 1920.
- Kenarlardan **80px güvenli boşluk** bırak; Nova'nın anteni ve el
  sallayan kolu kadraja en çok taşan parçalar, onları kontrol et.
- Nova lacivert zeminde en iyi okunuyor. Krem zemin kullanacaksan
  arkasına bir renk lekesi (daire, gezegen) koy ki krem giysisi
  zemine karışmasın.
- Metin sekiz kelimeyi geçmesin. Gerisi caption'a.
- Carousel'de Nova'yı her karede kullanma. İlk ve son karede yeter;
  ortadakiler işin kendisini göstersin.

---

## Hazır brief — Claude Design'a olduğu gibi yapıştır

> Nebula Genç Zeka için bir Instagram postu tasarla (1080×1350).
> Marka dili "Kâğıt Uzay": her şey kâğıttan kesilmiş gibi — düz dolgu,
> `#152343` lacivert kontur (3px), sert offset gölge (6px 6px 0, blur yok),
> gradyan yok.
>
> Palet: kâğıt `#F7F0E1`, uzay `#141F3C`, mürekkep `#152343`,
> amber `#FF9F45`, mavi `#3D5FE0`, mint `#2FD08A`, mercan `#FF6B8A`,
> menekşe `#8B6BFF`. Her rengin koyu eşi sadece gölge olarak kullanılır.
>
> Başlık fontu Fredoka, metin Nunito, etiketler IBM Plex Mono (büyük harf,
> geniş harf aralığı).
>
> Maskot: Nova, astronot. SVG'sini ekliyorum, olduğu gibi kullan.
> Vizörü opak, içinde yüz yok — sadece iki amber ışık ve bir beyaz yıldız.
> Nova'nın üzerinde hiçbir şey değiştirme.
>
> Kompozisyon, punto ve arka plan serbest; siteyle aynı olmasın ama aynı
> dünyada geçtiği anlaşılsın.
>
> Post konusu: [BURAYA YAZ]

---

## Bakım

Nova ya da sahne parçaları sitede değişirse:

```bash
node brand-kit/build.mjs
```

Tek doğruluk kaynağı hâlâ `web/src/components/cast/nova.tsx` ve `props.tsx`.
`build.mjs` onların geometrisinin kopyası — orada bir şey değişirse burayı da
güncelle.
