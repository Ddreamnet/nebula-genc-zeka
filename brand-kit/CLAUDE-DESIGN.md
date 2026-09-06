# Nebula Genç Zeka — Claude Design kaynak dosyası

Bu dosyanın tamamını Claude Design'a (ya da herhangi bir tasarım yapan
sohbete) yapıştır. İçinde site neyse o var: renkler, tipografi, kâğıt fiziği,
bileşen tarifleri ve Nova'nın çizim sistemi. Ekran görüntüsü ya da artifact
gerekmiyor — hepsi düz metin ve SVG.

**Nova'nın 23 pozu, 5 göz ifadesi ve 3 bakış yönü var; bunlar birbiriyle
serbest birleşiyor.** "Sağ elini kaldırmış, o yana dönük, gülen gözlü Nova"
demek `pose: raise-right` + `facing: right` + `eyes: happy` demek. Poz
tablosundaki kol koordinatlarını taban gövdeye yapıştırıyorsun, o kadar.

---

## 0 — Üç kullanım yolu

1. **Hazır dosya.** `brand-kit/svg/` içinde 39 hazır parça var — 30 Nova, 9 sahne
   parçası (aşağıda liste). `.svg` dosyasını aç, içindekini kopyala, prompt'a yapıştır. Hiçbir
   şey bozulmaz, en güvenilir yol.
2. **Yeni varyant üret.** Bu dosyadaki taban gövdeyi al, poz tablosundan
   kolları, göz tablosundan gözleri koy. Claude Design bunu kod olarak
   birleştirir.
3. **Terminalden üret.** Repoda çalışıyorsan:
   ```bash
   node brand-kit/build.mjs --list                       # bütün seçenekler
   node brand-kit/build.mjs --pose raise-right --facing right --eyes happy --name nova-duyuru
   node brand-kit/build.mjs                              # bütün seti yeniden yaz
   ```

---

## 1 — Palet

Sitenin canlı değerleri. Hex'ler birebir bunlar; ara ton uydurma.

| Rol | Hex | Nerede |
|---|---|---|
| Kâğıt (zemin) | `#F7F0E1` | Varsayılan dünya. Tasarımların yarısı bu zeminde. |
| Kâğıt, kabartılmış | `#FFFBF2` | Kart yüzeyi, Nova'nın giysisi. |
| Kâğıt, çukur | `#EDE3CF` | Bir kademe geri duran alanlar. |
| Kâğıt çizgisi | `#DCCFB4` | Zemindeki nokta ızgarası. |
| Uzay (zemin) | `#141F3C` | Tam genişlik koyu bantlar. Nova en iyi burada okunur. |
| Uzay, kabartılmış | `#1E2E52` | Koyu zemindeki kart. |
| Uzay, derin | `#0B1226` | Koyu zeminde gölge. |
| Uzay çizgisi | `rgba(183,199,235,.22)` | Koyu zeminde kenarlık. |
| Mürekkep | `#152343` | **Bütün konturlar ve gölgeler.** Asla saf siyah. |
| Mürekkep, yumuşak | `#5B6480` | İkincil metin. |
| Mürekkep, soluk | `#8A93AC` | Üçüncül metin, dipnot. |
| Krem üstü metin | `#F2ECDD` | Koyu zeminde başlık. |
| Krem üstü, yumuşak | `#A9B6D4` | Koyu zeminde ikincil metin. |
| Seçim vurgusu | `#FFD9A8` üstüne `#152343` | Metin seçimi. |

Vurgu renkleri. Her birinin bir `-deep` eşi var ve **o eş sadece sert gölge
olarak kullanılır** — hiçbir yerde dolgu değil:

| Renk | Dolgu | Gölge (-deep) | Ne için |
|---|---|---|---|
| Mavi | `#3D5FE0` | `#2437A6` | Birincil buton, Bit'in gövdesi |
| Amber | `#FF9F45` | `#D2701A` | Ana vurgu, Nova'nın gözleri ve botları |
| Mint | `#2FD08A` | `#17915B` | Onay, "tamam", ikinci vurgu |
| Mercan | `#FF6B8A` | `#CE3B5F` | Uyarı, dikkat, roket kanadı |
| Menekşe | `#8B6BFF` | `#5D3FD1` | Gezegen, yaratıcı konular |
| Yeşil | `#2c7a58` | `#194f38` | Sadece WhatsApp butonu |

Kural: mavi ve menekşe üstünde metin beyaz; amber, mint ve mercan üstünde
metin `#152343`.

---

## 2 — Tipografi

Üçü de Google Fonts'ta ücretsiz.

- **Fredoka** — bütün başlıklar ve buton yazıları. Ağırlık 500/600/700.
  `letter-spacing: -0.02em`, `line-height: 1.02`.
- **Nunito** — gövde metni. 400/600/700/800. Taban 17px, `line-height: 1.6`.
- **IBM Plex Mono** — etiket, sayaç, rozet. Hep BÜYÜK HARF,
  `letter-spacing: .14em` (bölüm etiketlerinde `.2em`), 12px.

Ölçek (sitede kullanılan clamp'ler):

```
h1    clamp(2.4rem, 6.2vw, 4.6rem)
h2    clamp(2rem, 5vw, 3.4rem)
h3    clamp(1.25rem, 2.2vw, 1.65rem)
lead  clamp(1.05rem, 1.55vw, 1.3rem)   rengi #5B6480
```

Bölüm etiketi (eyebrow) her başlığın üstünde durur: mono, büyük harf, solunda
22px'lik kısa bir çizgi.

---

## 3 — Kesme-kâğıt fiziği

Bütün siteyi tek bir kural yönetiyor: **her yüzey kâğıttan kesilmiş bir
parça** — düz dolgu, kalın lacivert kontur, altında sert ofset gölge.
Derinlik gölgenin ofsetinden geliyor, bulanıklıktan değil.

```
kontur    3px  (küçük parçalarda 2.5px)   rengi #152343
gölge     0 6px 0 0   — blur YOK, spread YOK
köşe      kart 22px · buton/kutu 16px · çip 999px
```

Gölge rengi: renkli bir yüzeyde o rengin `-deep` eşi, renksiz yüzeyde
`#152343`. Basma hareketi gölgeyi değiştirmez, parçayı 6px aşağı iter — parça
kendi gölgesinin üstüne oturur.

---

## 4 — Bileşen tarifleri

Web tasarımı yapılıyorsa bu CSS birebir siteden. Statik görsel yapılıyorsa
aynı ölçüleri şekil olarak kur.

**Kart**
```css
background: #FFFBF2;
border: 3px solid #152343;
border-radius: 22px;
box-shadow: 0 6px 0 0 #152343;   /* renkliyse o rengin -deep eşi */
```
Hover: `transform: translateY(-4px)`. Basılınca: `translateY(6px)`.
Koyu zeminde: zemin `#1E2E52`, kenarlık `rgba(183,199,235,.22)`, gölge `#0B1226`.

**Buton — iki katman, çünkü basma hareketi saf transform olmalı**
```html
<a class="nb-btn nb-btn--blue"><span class="nb-btn__face">Yazı</span></a>
```
```css
.nb-btn { position: relative; --fill:#3D5FE0; --deep:#2437A6; --fg:#fff; }
.nb-btn::before {           /* alttaki kalıp */
  content:""; position:absolute; left:0; right:0; top:6px; bottom:-6px;
  background: var(--deep); border:3px solid #152343; border-radius:16px;
}
.nb-btn__face {             /* hareket eden kapak */
  position:relative; display:inline-flex; align-items:center; justify-content:center;
  gap:10px; padding:15px 26px; min-height:52px;
  background: var(--fill); color: var(--fg);
  border:3px solid #152343; border-radius:16px;
  font-family:Fredoka; font-weight:600; font-size:16px; line-height:1;
  transition: transform .11s cubic-bezier(.2,.8,.3,1);
}
.nb-btn:hover .nb-btn__face  { transform: translateY(-2px); }
.nb-btn:active .nb-btn__face { transform: translateY(6px); }
```
Boyutlar: küçük `11px 18px / min-height 44px / 14.5px`, büyük
`18px 32px / 60px / 17.5px`. İkon butonu 48×48 kare.

**Çip / etiket**
```css
padding: 8px 15px; border: 3px solid #152343; border-radius: 999px;
background: #FFFBF2; font-family: "IBM Plex Mono"; font-size: 12.5px;
font-weight: 600; letter-spacing: .06em; color: #152343;
```

**Kâğıt zemin (nokta ızgarası)**
```css
background-color: #F7F0E1;
background-image: radial-gradient(#DCCFB4 1.4px, transparent 1.4px);
background-size: 26px 26px;
```

**Uzay bandı ile kâğıt arasındaki yırtık dikiş**
```css
height: clamp(28px,4vw,56px); background: #141F3C;
mask-image: radial-gradient(circle at 50% 0, transparent 0, transparent 68%, #000 70%);
mask-size: clamp(38px,5vw,68px) 100%; mask-repeat: repeat-x;
```

**Yıldızlı gökyüzü** — koyu bantta, üst üste birkaç `radial-gradient`
noktası; büyük `background-size` ile seyrek dağılır, ayrı bir katmanda
`opacity` 0.28↔0.85 arası 5sn'lik nefes alır.

**Hareket kuralı.** Sadece `transform` ve `opacity` animasyonlanır.
`box-shadow`, `filter`, `backdrop-filter`, `width/height` asla. Süzülme 7sn,
sallanma 4.2sn, sürüklenme 11sn; hepsi küçük genlikli. Aynı anda ekranda olan
parçalara farklı `animation-delay` ver, yoksa mekanik durur.

---

## 5 — Yapılmayacaklar

- Gradyan. Hiçbir yerde.
- Yumuşak/blurlu gölge. Gölge her zaman sert ve ofset.
- Nova'nın vizörüne yüz çizmek: ağız, kaş, göz bebeği, burun — yok.
- Saf siyah (`#000`) ya da saf beyaz (`#FFF`) geniş alan. Kontur `#152343`,
  beyaz alan `#FFFBF2`.
- Stok astronot görseli. Nova varken başka astronot kullanılmaz.
- Emoji. Yıldız gerekiyorsa `star-*.svg` var.
- Nova'yı esnetmek. Orantı sabit; büyüt küçült ama deforme etme.

---

## 6 — Nova: kilitli karakter kuralları

Bunlar değişirse çizilen şey Nova olmaktan çıkar.

- **Vizör opak, içinde yüz yok.** Sadece iki amber ışık ve bir yıldız
  yansıması. Bütün ifade o iki ışığın şeklinden gelir — Nova bu yüzden
  kimseye benzemiyor.
- **Vizördeki dört köşeli beyaz yıldız Nova'nın imzası.** Hep sağ üstte.
  Kafa dönse bile sağ üstte kalır.
- Her şekil aynı kalınlıkta lacivert konturlu. Gradyan yok, blur yok.
- Kollar ve bacaklar boru: kalın lacivert çizgi + üstüne ince krem çizgi.
  Bilekte amber manşet, ucunda krem eldiven.
- Göğüs panelindeki iki nokta (üstte mint, altta amber) hep durur. Ambere
  niyetli görünümünü veren şey oradaki mint.
- Anten hep sağ üstte, ucunda amber top.

<!-- NOVA:BEGIN — bu blok build.mjs tarafından üretiliyor, elle düzenleme -->

### Taban gövde — her Nova bununla başlar

Aşağıdaki kod eksiksiz bir Nova. Üç yere dokunuyorsun: `BACAKLAR`, `KOLLAR`
ve `GÖZLER`. Gerisi sabit — gövde, kask, anten, göğüs paneli, imza yıldızı
hiçbir varyantta değişmez. Sıralama da sabit: kollar gövdenin ve kaskın
ALTINDA kalır.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 236" fill="none">
  <!-- anten -->
  <path d="M134 38L164 12" stroke="#152343" stroke-width="9" stroke-linecap="round"/>
  <path d="M134 38L164 12" stroke="#FFFBF2" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="166" cy="11" r="9" fill="#FF9F45" stroke="#152343" stroke-width="6"/>

  <!-- sırt ünitesi -->
  <rect x="62" y="112" width="76" height="62" rx="24" fill="#E7DCC6" stroke="#152343" stroke-width="7"/>

  <!-- BACAKLAR buraya -->
  <!-- KOLLAR buraya -->

  <!-- gövde -->
  <rect x="66" y="108" width="68" height="78" rx="27" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>

  <!-- göğüs paneli -->
  <rect x="83" y="132" width="34" height="26" rx="8" fill="#FFFBF2" stroke="#152343" stroke-width="5"/>
  <circle cx="93" cy="141" r="3.6" fill="#2FD08A"/>
  <circle cx="93" cy="150" r="3.6" fill="#FF9F45"/>
  <rect x="101" y="139" width="11" height="4" rx="2" fill="#152343" opacity="0.35"/>
  <rect x="101" y="147" width="8" height="4" rx="2" fill="#152343" opacity="0.22"/>

  <!-- kask yan podları -->
  <ellipse cx="46" cy="74" rx="11" ry="17" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>
  <ellipse cx="154" cy="74" rx="11" ry="17" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>

  <!-- kask + vizör -->
  <circle cx="100" cy="72" r="56" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>
  <circle cx="100" cy="72" r="43" fill="#101B38"/>

  <!-- GÖZLER buraya -->

  <!-- imza yıldızı: hep sağ üstte -->
  <path d="M126 44l3.1 8.4 8.4 3.1-8.4 3.1-3.1 8.4-3.1-8.4-8.4-3.1 8.4-3.1z" fill="#FFFFFF" opacity="0.95"/>
</svg>
```

Bir kol her zaman şu dört parça — biri eksilirse kol kol olmaktan çıkar:

```svg
<path d="{d}"    stroke="#152343" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{d}"    stroke="#FFFBF2" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{cuff}" stroke="#FF9F45" stroke-width="19" stroke-linecap="butt" fill="none"/>
<circle cx="{el.x}" cy="{el.y}" r="13" fill="#FFFBF2" stroke="#152343" stroke-width="7"/>
```

Bacak da dört parça:

```svg
<path d="{d}"   stroke="#152343" stroke-width="25" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{d}"   stroke="#FFFBF2" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="{bot}" stroke="#152343" stroke-width="29" stroke-linecap="round" fill="none"/>
<path d="{bot}" stroke="#FF9F45" stroke-width="22" stroke-linecap="round" fill="none"/>
```

### Bacak setleri

**STAND**
```
sol  d="M88 174L88 202"   bot="M89 206L74 206"
sağ  d="M112 174L112 202"   bot="M111 206L126 206"
```

**TUCK**
```
sol  d="M89 175L78 195"   bot="M79 197L64 202"
sağ  d="M111 175L121 196"   bot="M121 198L136 203"
```

**STRIDE**
```
sol  d="M88 174L74 198"   bot="M74 202L59 203"
sağ  d="M112 174L122 200"   bot="M122 204L137 202"
```

**JUMP**
```
sol  d="M89 174L70 188L76 204"   bot="M77 207L62 209"
sağ  d="M111 174L130 188L124 204"   bot="M123 207L138 209"
```

**DANGLE**
```
sol  d="M89 176L84 205"   bot="M84 208L69 209"
sağ  d="M111 176L116 205"   bot="M116 208L131 209"
```

### Pozlar — 23 hazır poz

**float**
```
sol kol   d="M74 133L40 151"  cuff="M54 144L43 150"  el=(36, 155)
sağ kol   d="M126 133L160 151"  cuff="M146 144L157 150"  el=(164, 155)
bacak     TUCK
```

**wave**
```
sol kol   d="M74 135L57 167"  cuff="M64 154L59 163"  el=(53, 173)
sağ kol   d="M126 129L166 101"  cuff="M157 108L164 103"  el=(174, 96)
bacak     STAND
```

**cheer**
```
sol kol   d="M74 131L42 100"  cuff="M52 110L44 102"  el=(33, 93)
sağ kol   d="M126 131L158 100"  cuff="M148 110L156 102"  el=(167, 93)
bacak     STAND
```

**point**
```
sol kol   d="M74 135L58 165"  cuff="M65 152L60 161"  el=(54, 171)
sağ kol   d="M126 136L161 130"  cuff="M148 132L159 130"  el=(167, 129)
bacak     STAND
```

**think**
```
sol kol   d="M74 136L52 158"  cuff="M60 150L54 156"  el=(46, 164)
sağ kol   d="M126 134L160 112"  cuff="M150 118L158 113"  el=(168, 107)
bacak     STAND
```

**point-left**
```
sol kol   d="M74 134L38.5 127.7"  cuff="M54.1 130.5L41 128.2"  el=(32.6, 126.7)
sağ kol   d="M126 134L142 164"  cuff="M134.9 150.8L140.8 161.9"  el=(144.8, 169.3)
bacak     STAND
```

**point-up**
```
sol kol   d="M74 134L61.3 165.5"  cuff="M66.9 151.7L62.2 163.3"  el=(59, 171.1)
sağ kol   d="M126 134L172 124L180 56"  cuff="M174.8 100.2L178.9 65.5"  el=(180.7, 50)
bacak     STAND
```

**point-down**
```
sol kol   d="M74 134L61.3 165.5"  cuff="M66.9 151.7L62.2 163.3"  el=(59, 171.1)
sağ kol   d="M126 134L160.7 161.1"  cuff="M145.4 149.2L158.2 159.2"  el=(165.4, 164.8)
bacak     STAND
```

**point-far**
```
sol kol   d="M74 134L61.3 165.5"  cuff="M66.9 151.7L62.2 163.3"  el=(59, 171.1)
sağ kol   d="M126 134L173.5 127.3"  cuff="M152.6 130.3L170.2 127.8"  el=(179.5, 126.5)
bacak     STAND
```

**wave-left**
```
sol kol   d="M74 134L34.7 106.5"  cuff="M52 118.6L37.4 108.4"  el=(29.8, 103)
sağ kol   d="M126 134L142.9 165.8"  cuff="M135.5 151.8L141.7 163.6"  el=(145.7, 171.1)
bacak     STAND
```

**raise-right**
```
sol kol   d="M74 134L65.8 167"  cuff="M69.4 152.5L66.4 164.7"  el=(64.3, 172.8)
sağ kol   d="M126 134L162.1 93.9"  cuff="M146.2 111.5L159.6 96.7"  el=(166.1, 89.4)
bacak     STAND
```

**raise-left**
```
sol kol   d="M74 134L37.9 93.9"  cuff="M53.8 111.5L40.4 96.7"  el=(33.9, 89.4)
sağ kol   d="M126 134L134.2 167"  cuff="M130.6 152.5L133.6 164.7"  el=(135.7, 172.8)
bacak     STAND
```

**present-right**
```
sol kol   d="M74 134L60.6 164.1"  cuff="M66.5 150.9L61.5 162"  el=(58.1, 169.6)
sağ kol   d="M126 134L170.6 145.1"  cuff="M151 140.2L167.5 144.3"  el=(176.5, 146.6)
bacak     STAND
```

**present-left**
```
sol kol   d="M74 134L29.4 145.1"  cuff="M49 140.2L32.5 144.3"  el=(23.5, 146.6)
sağ kol   d="M126 134L139.4 164.1"  cuff="M133.5 150.9L138.5 162"  el=(141.9, 169.6)
bacak     STAND
```

**salute**
```
sol kol   d="M74 134L68.1 167.5"  cuff="M70.7 152.8L68.5 165.1"  el=(67.1, 173.4)
sağ kol   d="M126 134L168 112L142 56"  cuff="M158.9 92.4L145.6 63.8"  el=(139.5, 50.6)
bacak     STAND
öndeki    sağ kol kaskın ÜSTÜNE çizilir
```

**shrug**
```
sol kol   d="M74 134L41.3 124.6"  cuff="M55.7 128.8L43.6 125.3"  el=(35.5, 123)
sağ kol   d="M126 134L158.7 124.6"  cuff="M144.3 128.8L156.4 125.3"  el=(164.5, 123)
bacak     STAND
```

**hold**
```
sol kol   d="M74 134L26.3 139"  cuff="M47.3 136.8L29.6 138.7"  el=(20.3, 139.6)
sağ kol   d="M126 134L173.7 139"  cuff="M152.7 136.8L170.4 138.7"  el=(179.7, 139.6)
bacak     STAND
```

**hips**
```
sol kol   d="M74 134L42 152L56 176"  cuff="M46.9 160.4L54 172.6"  el=(59, 181.2)
sağ kol   d="M126 134L158 152L144 176"  cuff="M153.1 160.4L146 172.6"  el=(141, 181.2)
bacak     STAND
```

**open**
```
sol kol   d="M74 134L33.2 150.5"  cuff="M51.2 143.2L36.1 149.3"  el=(27.6, 152.7)
sağ kol   d="M126 134L166.8 150.5"  cuff="M148.8 143.2L163.9 149.3"  el=(172.4, 152.7)
bacak     STAND
```

**fly**
```
sol kol   d="M74 134L54 168.6"  cuff="M62.8 153.4L55.4 166.2"  el=(51, 173.8)
sağ kol   d="M126 134L172.1 120.8"  cuff="M151.8 126.6L168.9 121.7"  el=(177.9, 119.1)
bacak     TUCK
```

**jump**
```
sol kol   d="M74 134L38 91.1"  cuff="M53.8 110L40.5 94.1"  el=(34.1, 86.5)
sağ kol   d="M126 134L162 91.1"  cuff="M146.2 110L159.5 94.1"  el=(165.9, 86.5)
bacak     JUMP
```

**walk**
```
sol kol   d="M74 134L54.9 164.5"  cuff="M63.3 151.1L56.3 162.4"  el=(51.7, 169.6)
sağ kol   d="M126 134L148.2 162.4"  cuff="M138.4 149.9L146.6 160.4"  el=(151.9, 167.1)
bacak     STRIDE
```

**hover**
```
sol kol   d="M74 134L56 165.2"  cuff="M63.9 151.5L57.3 163"  el=(53, 170.4)
sağ kol   d="M126 134L144 165.2"  cuff="M136.1 151.5L142.7 163"  el=(147, 170.4)
bacak     DANGLE
```

### Gözler — tek ifade kanalı

Işıkların merkezi her varyantta aynı: (85.5, 72) ve (114.5, 72). Sadece şekil
değişir; bu yüzden hiçbir ifade "başka bir karakter" gibi durmaz.

**default**
```svg
<rect x="73" y="57" width="25" height="30" rx="12" fill="#FF9F45" opacity="0.22"/>
<rect x="102" y="57" width="25" height="30" rx="12" fill="#FF9F45" opacity="0.22"/>
<rect x="77" y="61" width="17" height="22" rx="8.5" fill="#FF9F45"/>
<rect x="106" y="61" width="17" height="22" rx="8.5" fill="#FF9F45"/>
```

**wide**
```svg
<rect x="71" y="54.5" width="29" height="35" rx="14.5" fill="#FF9F45" opacity="0.22"/>
<rect x="100" y="54.5" width="29" height="35" rx="14.5" fill="#FF9F45" opacity="0.22"/>
<rect x="75" y="58.5" width="21" height="27" rx="10.5" fill="#FF9F45"/>
<rect x="104" y="58.5" width="21" height="27" rx="10.5" fill="#FF9F45"/>
```

**focus**
```svg
<rect x="76" y="56" width="19" height="32" rx="9.5" fill="#FF9F45" opacity="0.22"/>
<rect x="105" y="56" width="19" height="32" rx="9.5" fill="#FF9F45" opacity="0.22"/>
<rect x="80" y="60" width="11" height="24" rx="5.5" fill="#FF9F45"/>
<rect x="109" y="60" width="11" height="24" rx="5.5" fill="#FF9F45"/>
```

**closed**
```svg
<rect x="72" y="66.5" width="27" height="11" rx="5.5" fill="#FF9F45" opacity="0.22"/>
<rect x="101" y="66.5" width="27" height="11" rx="5.5" fill="#FF9F45" opacity="0.22"/>
<rect x="76" y="69.3" width="19" height="5.5" rx="2.8" fill="#FF9F45"/>
<rect x="105" y="69.3" width="19" height="5.5" rx="2.8" fill="#FF9F45"/>
```

**happy**
```svg
<path d="M75.5 78Q85.5 60 95.5 78" stroke="#FF9F45" stroke-width="15" stroke-linecap="round" opacity="0.22" fill="none"/>
<path d="M104.5 78Q114.5 60 124.5 78" stroke="#FF9F45" stroke-width="15" stroke-linecap="round" opacity="0.22" fill="none"/>
<path d="M75.5 78Q85.5 60 95.5 78" stroke="#FF9F45" stroke-width="7" stroke-linecap="round" fill="none"/>
<path d="M104.5 78Q114.5 60 124.5 78" stroke="#FF9F45" stroke-width="7" stroke-linecap="round" fill="none"/>
```

### Bakış — gövde durur, kafa döner

Gövdeye, kollara, bacaklara dokunma. Sadece şunlar kayar:

**front** — vizör `cx="100"` · gözler `translate(0 0)` · imza yıldızı `translate(0 0)` · göğüs paneli `translate(0 0)` · sol pod `cx="46" rx="11" ry="17"` · sağ pod `cx="154" rx="11" ry="17"`

**right** — vizör `cx="106"` · gözler `translate(10 0)` · imza yıldızı `translate(6 0)` · göğüs paneli `translate(5 0)` · sol pod `cx="50" rx="8" ry="14"` · sağ pod `cx="157" rx="12" ry="18"`

**left** — vizör `cx="94"` · gözler `translate(-10 0)` · imza yıldızı `translate(-6 0)` · göğüs paneli `translate(-5 0)` · sol pod `cx="43" rx="12" ry="18"` · sağ pod `cx="150" rx="8" ry="14"`

### Eğim

Bütün içeriği `<g transform="rotate(AÇI 100 118)">` içine al ve viewBox'ı
`-26 -18 252 272` yap (dönen figürün anteni ve eli yoksa kadraja taşar).
Uçuş için -24°, atılım için +18° iyi çalışıyor. Eğim yoksa viewBox
`0 0 200 236` kalır.

<!-- NOVA:END -->

---

## 7 — Yeni poz uydurma kuralları

Tablodaki 23 poz yetmezse yenisini kurabilirsin. Kol, omuzdan çıkan tek bir
doğru parçası; üç sayıyla tanımlanıyor: **omuz, açı, uzunluk**.

```
omuzlar     sol (74, 134) · sağ (126, 134)
açı         0° sağ · 90° AŞAĞI · -90° yukarı · 180° sol
            (SVG'de y ekseni aşağı bakar, o yüzden negatif açı yukarı demek)
uzunluk     34–56 arası. Yana sarkan kol 34–40, kalkık kol 54+.
```

Verilen açı ve uzunluktan üç parça çıkıyor:

```
d      omuzdan uca düz çizgi
cuff   o çizginin %56 ile %93'ü arası (amber manşet)
el     ucun 6 birim ötesi (eldiven dairesinin merkezi, r=13)
```

Dirsekli kol gerekiyorsa `d` üç noktalı olur (`M omuz L dirsek L el`), manşet
dirsek→el parçasının %35–%86'sına oturur.

**İki çakışma kuralı — kollar gövdenin ve kaskın ALTINDA çizildiği için:**

1. El, gövde kutusunun içine düşmemeli: `x 62–138, y 108–186`. Düşerse el
   görünmez olur. (Bu yüzden "iki el önde bir şey tutuyor" pozu yok; onun
   yerine `hold` pozunda eller iki yana açılır, tuttuğu nesne gövdeyi örter.)
2. Kalkık kol kaskı geçmeli: kolun ucu (100, 72) merkezinden **en az 64**,
   eldiven merkezi **en az 70** birim uzakta olmalı. Bu yüzden `point-up`
   düz yukarı gitmiyor, dirsekten kırılıp kaskın yanından dolaşıyor.

Vizöre değmesi gereken bir hareket (selam gibi) varsa o kolu istisna olarak
**en sona**, imza yıldızından sonra çiz. Poz tablosunda bu `öndeki` satırıyla
işaretli.

Yeni poz uydururken önce aynasını düşün: sağ için yazdığın açıyı sola
çevirmek `180 - açı` demek. `point` → `point-left` böyle çıktı.

---

## 8 — Sahne parçaları

Nova'nın dünyası. Hepsi aynı kontur kuralına uyuyor, hepsi tek başına da
kullanılabilir. Hazır dosyalar: `brand-kit/svg/` ve `brand-kit/png/`.

**Yıldız** (bullet, konfeti, vurgu — rengi değişir: amber / mint / mercan / `#9BE7FF`)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M24 2l5.6 15.2L44.8 24l-15.2 6.8L24 46l-5.6-15.2L3.2 24l15.2-6.8z"
        fill="#FF9F45" stroke="#152343" stroke-width="3.5" stroke-linejoin="round"/>
</svg>
```

**Gezegen** (halka gövdenin arkasından geçsin diye iki yay — tek elips değil)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 76" fill="none">
  <path d="M12 46a40 13 -18 0 0 72-22" stroke="#152343" stroke-width="9" stroke-linecap="round"/>
  <circle cx="48" cy="38" r="26" fill="#8B6BFF" stroke="#152343" stroke-width="4.5"/>
  <circle cx="39" cy="30" r="6" fill="#FFFFFF" opacity="0.28"/>
  <circle cx="57" cy="45" r="4" fill="#FFFFFF" opacity="0.2"/>
  <path d="M84 24a40 13 -18 0 1 -72 22" stroke="#152343" stroke-width="9" stroke-linecap="round"/>
  <path d="M84 24a40 13 -18 0 1 -72 22" stroke="#FFD27A" stroke-width="4" stroke-linecap="round"/>
</svg>
```

**Kuyruklu yıldız**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72" fill="none">
  <path d="M62 16 6 66l30-8 4 12 12-14 14 6z" fill="#2FD08A" stroke="#152343"
        stroke-width="4.5" stroke-linejoin="round" opacity="0.9"/>
  <circle cx="68" cy="22" r="17" fill="#2FD08A" stroke="#152343" stroke-width="5"/>
  <circle cx="62" cy="16" r="5" fill="#FFFFFF" opacity="0.45"/>
</svg>
```

**Roket**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 112" fill="none">
  <path d="M18 56 4 84l18-6z" fill="#FF6B8A" stroke="#152343" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M54 56 68 84l-18-6z" fill="#FF6B8A" stroke="#152343" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M36 4c14 14 20 34 18 56v18H18V60C16 38 22 18 36 4z" fill="#FFFBF2" stroke="#152343" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="36" cy="42" r="11" fill="#3D5FE0" stroke="#152343" stroke-width="4.5"/>
  <circle cx="32" cy="38" r="3.4" fill="#FFFFFF" opacity="0.6"/>
  <path d="M22 82h28" stroke="#152343" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M26 86q10 22 20 0z" fill="#FF9F45" stroke="#152343" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M31 88q5 11 10 0z" fill="#FFD27A"/>
</svg>
```

**Bit** — Nova'nın yardımcısı, tek gözlü küp drone. Konu "makine"yse.
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 104" fill="none">
  <path d="M48 20L48 8" stroke="#152343" stroke-width="6" stroke-linecap="round"/>
  <circle cx="48" cy="7" r="7" fill="#FF9F45" stroke="#152343" stroke-width="4.5"/>
  <rect x="4" y="44" width="16" height="26" rx="8" fill="#3D5FE0" stroke="#152343" stroke-width="5"/>
  <rect x="76" y="44" width="16" height="26" rx="8" fill="#3D5FE0" stroke="#152343" stroke-width="5"/>
  <rect x="16" y="20" width="64" height="64" rx="22" fill="#3D5FE0" stroke="#152343" stroke-width="5"/>
  <rect x="28" y="38" width="40" height="28" rx="14" fill="#152343"/>
  <circle cx="48" cy="52" r="9" fill="#9BE7FF"/>
  <circle cx="44" cy="48" r="3" fill="#FFFFFF" opacity="0.9"/>
  <rect x="34" y="74" width="28" height="5" rx="2.5" fill="#152343" opacity="0.35"/>
</svg>
```

---

## 9 — Hazır dosyalar

`brand-kit/svg/` ve `brand-kit/png/` (1600px, şeffaf zemin):

```
nova-float          varsayılan, süzülüyor            nova-raise-right    tek kol havada, sağ
nova-wave           el sallıyor                      nova-raise-left     tek kol havada, sol
nova-wave-left      sol elle sallıyor, o yana dönük  nova-present-right  avuç açık sunuş, dönük
nova-cheer          iki kol havada, kutlama          nova-present-left   sunuş, sol
nova-point          sağı gösteriyor                  nova-salute         selam
nova-point-turned   sağı gösteriyor, o yana dönük    nova-shrug          omuz silkme
nova-point-left     solu gösteriyor                  nova-hold           iki el yanda, araya tabela
nova-point-left-turned  solu gösteriyor, dönük       nova-hips           eller belde
nova-point-up       yukarıyı gösteriyor, şaşkın      nova-open           kollar açık, gülen göz
nova-point-down     aşağıyı gösteriyor               nova-jump           zıplıyor, gülen göz
nova-point-far      uzun kol, yanındaki görsele      nova-fly            uçuyor (eğimli)
nova-think          elini çenesine götürmüş          nova-walk           yürüyor
nova-float-mint     gözleri mint                     nova-hover          havada asılı, en sakin
nova-happy          gülen göz                        nova-sleep          gözler kapalı
nova-wow            şaşkın, iki kol havada           nova-focus          odaklanmış, dönük

star-amber · star-mint · star-coral · star-blue · planet-violet · planet-coral
comet-mint · rocket · bit-blue
```

---

## 10 — Hazır brief (Instagram postu)

> Nebula Genç Zeka için bir Instagram postu tasarla (1080×1350).
> Marka dili "Kâğıt Uzay": her şey kâğıttan kesilmiş gibi — düz dolgu,
> `#152343` lacivert kontur (3px), sert ofset gölge (0 6px 0, blur yok),
> gradyan yok.
>
> Palet: kâğıt `#F7F0E1`, uzay `#141F3C`, mürekkep `#152343`,
> amber `#FF9F45`, mavi `#3D5FE0`, mint `#2FD08A`, mercan `#FF6B8A`,
> menekşe `#8B6BFF`. Her rengin koyu eşi sadece gölge olarak kullanılır.
>
> Başlık fontu Fredoka, metin Nunito, etiketler IBM Plex Mono (büyük harf,
> geniş harf aralığı).
>
> Maskot: Nova, astronot. SVG'sini ekliyorum, olduğu gibi kullan. Vizörü
> opak, içinde yüz yok — sadece iki amber ışık ve bir beyaz yıldız. Nova'nın
> üzerinde hiçbir şey değiştirme.
>
> Kompozisyon, punto ve arka plan serbest; siteyle aynı olmasın ama aynı
> dünyada geçtiği anlaşılsın.
>
> Post konusu: [BURAYA YAZ]

**Instagram pratik notları.** Post 1080×1350 (4:5), story/reels kapağı
1080×1920. Kenarlardan 80px güvenli boşluk bırak; Nova'nın anteni ve kalkık
kolu kadraja en çok taşan parçalar. Nova lacivert zeminde en iyi okunuyor —
krem zemin kullanacaksan arkasına bir renk lekesi (daire, gezegen) koy ki
krem giysisi zemine karışmasın. Metin sekiz kelimeyi geçmesin. Carousel'de
Nova'yı her karede kullanma; ilk ve son kare yeter.

**Serbest olduğun yerler.** Kompozisyon (Nova'yı kadraja taşır, keser, dev
yaparsın), punto ölçeği (postta başlık siteden çok daha büyük olmalı), arka
plan (paletteki herhangi bir renk tam zemin olabilir — kontur ve gölge
lacivert kaldığı sürece tutar), yeni şekiller (palet ve kontur kuralına uyan
uydu, konuşma balonu, çerçeve çizebilirsin), doku (hafif kâğıt dokusu ya da
noktalı raster iyi durur; sitede yok ama postta serbest).
