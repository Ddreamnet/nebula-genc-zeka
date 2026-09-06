# Nebula Genç Zeka — "Ne üretiyor" çıktı kartı · Claude Design kaynağı

Bu dosyanın tamamını Claude Design'a yapıştır. Ana sayfadaki **01 — NE ÜRETİYOR**
bölümündeki kartın birebir kendisi: ölçüler, renkler, HTML/CSS'i ve üst
yarısındaki altı çizimin SVG kodu. Ekran görüntüsüne gerek yok, hepsi burada.

`CLAUDE-DESIGN.md` (marka kitinin tamamı) ile birlikte de verilebilir, tek
başına da çalışır — buradaki bütün değerler değişken değil, sabit hex.

---

## 0 — Kartın anatomisi

Tek kural: kart, kâğıttan kesilmiş bir parça. Düz dolgu, kalın lacivert
kontur, altında **sert** ofset gölge (blur yok). Kartın **üst yarısı renkli bir
panel ve içinde tek bir çizim var**; alt yarısı metin. İkisini 3px'lik bir
çizgi ayırıyor — panelin alt kenarı zaten kartın konturu kalınlığında.

**Dikey varyant** (dar hücre):

```
┌────────────────────────────────┐ ← kontur 3px #152343, köşe 22px
│                                │
│        RENKLİ PANEL            │   düz dolgu (kartın kendi tonu)
│      ┌ ─ ─ ─ ─ ─ ─ ─ ┐         │   min-yükseklik 148px
│        SVG SAHNE 320×190       │   sahne panele ortalanır, taşmaz
│      └ ─ ─ ─ ─ ─ ─ ─ ┘         │   panel artan boşluğu emer (flex:1)
│                                │
├────────────────────────────────┤ ← 3px ayırıcı
│ ÇIKTI 03                       │   mono, 12px, .2em, kartın -deep tonu
│ Oyun                           │   Fredoka 600
│ Kuralları o koyuyor. Sonunda   │   Nunito 15px/1.5, #5B6480
│ arkadaşı oturup oynuyor.       │
│ Öğrencilerin işlerini gör →    │   Fredoka 500 14.5px, -deep ton
└────────────────────────────────┘
     ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀  ← 0 6px 0 0, blur yok, rengi -deep ton
```

**Yatay varyant** (geniş hücre): aynı kart, panel sola geçiyor. Grid
`1.4fr / 1fr`; ayırıcı alt kenar değil sağ kenar olur, panel min-yükseklik
168px, metin bloğu dikeyde ortalanır.

Kritik iki detay — bunlar atlanırsa kart bozulur:

1. **Panel boşluğu emer.** Yan yana duran kartlar aynı boya uzuyor; bu fazlalık
   metnin altına ölü boşluk olarak değil, panele eklenir. Çizim böylece hep
   optik merkezde kalır.
2. **Sahne panele "letterbox" olur.** SVG mutlak konumlu, dört kenardan
   içeri: `top:14 left:16 width:calc(100% - 32px) height:calc(100% - 28px)`,
   `preserveAspectRatio="xMidYMid meet"`. Normal akışta bırakılırsa SVG kendi
   doğal yüksekliğine büyür ve kartı yüzlerce piksel uzatır.

---

## 1 — Sabit geometri

| Ne | Değer |
|---|---|
| Kontur | `3px solid #152343` (asla siyah) |
| Köşe yarıçapı | kart `22px` · kontrol `16px` · çip `999px` |
| Sert gölge | `0 6px 0 0 <ton>` — blur 0, spread 0 |
| Kart zemini | `#FFFBF2` |
| Panel min-yükseklik | dikey `148px` · yatay `168px` |
| Metin bloğu iç boşluk | `18px 20px 20px` |
| Metin satır arası boşluk | `7px` |
| Kartlar arası boşluk (grid) | `clamp(16px, 2vw, 22px)` |
| Hover | `translateY(-4px)` · basılınca `translateY(6px)` |
| Sahne viewBox | `0 0 320 190` |

Hareket kuralı: sadece `transform` ve `opacity` animasyonlanır. `box-shadow`,
`filter`, `blur` asla — gölge sabittir, kart basılınca kendi gölgesinin
üstüne oturur.

**Ölçek notu.** Kart 380px genişlik için tasarlandı. Baskı ya da 1080px'lik bir
tuvalde büyütülüyorsa kontur, gölge ve yarıçap da aynı oranda büyür
(ör. 3× ölçekte kontur 9px, gölge 18px, köşe 66px). Konturu sabit bırakıp
kartı büyütmek kesme-kâğıt hissini bitirir.

---

## 2 — Altı kartın kimliği

Her kartın **bir** rengi var: panel dolgusu açık ton, gölge + eyebrow + link
oku koyu (-deep) ton. Kart içinde ikinci bir vurgu rengi kullanılmaz (çizimin
içi hariç).

| # | Başlık | Panel dolgusu | Gölge / eyebrow / ok | Genişlik | Alt metin |
|---|---|---|---|---|---|
| ÇIKTI 01 | Kendi web sitesi | `#DCD2FF` | `#5D3FD1` | geniş (4/6) | Aklındaki fikri anlatıyor, sitesi çıkıyor. Sonra linki sınıf grubuna atıyor. |
| ÇIKTI 02 | Konuşan 3D avatar | `#C6F1DC` | `#17915B` | dar (2/6) | Karakteri o çiziyor, sesi o veriyor. Karakter ekranda konuşuyor. |
| ÇIKTI 03 | Oyun | `#FFD6DE` | `#CE3B5F` | dar (2/6) | Kuralları o koyuyor. Sonunda arkadaşı oturup oynuyor. |
| ÇIKTI 04 | Afiş & görsel | `#FFE1C4` | `#D2701A` | dar (2/6) | Odasına asacak kalitede afişler. Baskıya hazır çıkıyor. |
| ÇIKTI 05 | Müzik & şarkı | `#D3DCFB` | `#2437A6` | dar (2/6) | Sözü onun, melodisi onun. Telefonda çalınabilecek bir parça. |
| ÇIKTI 06 | Video & kısa film | `#FFEBCF` | `#D2701A` | tam (6/6, yatay) | Senaryodan kurguya kadar hepsi onun. Sonunda izlenecek bir kısa film. |

Yerleşim: 6 kolonluk grid. 4+2 (ilk satır), 2+2+2 (ikinci satır), 6 (yatay
kart). 860px altında hepsi tek kolona düşer.

---

## 3 — Tipografi

Üçü de Google Fonts'ta ücretsiz.

- **Fredoka** — başlıklar ve buton/link yazısı. 500/600. `letter-spacing:-0.02em`.
  Kart başlığı `clamp(1.25rem, 2.2vw, 1.65rem)`, `line-height:1.15`.
- **Nunito** — gövde. Kart açıklaması 15px / 1.5 / `#5B6480`.
- **IBM Plex Mono** — eyebrow. 12px, 600, BÜYÜK HARF, `letter-spacing:.2em`,
  solunda 22px genişliğinde 3px kalınlığında bir çizgi.

---

## 4 — Kopyala-yapıştır kart (bağımsız HTML + CSS)

Değişken yok, siteden bağımsız çalışır. `--tone` ve `--panel`i değiştirerek
altı varyantın hepsi çıkar. Yatay varyant için karta `oc--wide` ekle.

```html
<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600&family=IBM+Plex+Mono:wght@600&display=swap');

.oc {
  --tone: #CE3B5F;            /* gölge + eyebrow + ok rengi */
  --panel: #FFD6DE;           /* üst panelin dolgusu */
  position: relative;
  display: flex;
  flex-direction: column;
  width: 380px;               /* hücrenin genişliği; grid'de %100 */
  background: #FFFBF2;
  color: #152343;
  border: 3px solid #152343;
  border-radius: 22px;
  box-shadow: 0 6px 0 0 var(--tone);
  overflow: hidden;
  text-decoration: none;
  font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
  transition: transform .16s cubic-bezier(.2,.8,.3,1);
}
.oc:hover  { transform: translateY(-4px); }
.oc:active { transform: translateY(6px); }

/* Üst yarı: renkli panel + içindeki çizim */
.oc__panel {
  position: relative;                       /* sahnenin çapası */
  flex: 1;                                  /* fazla boyu bu emer */
  min-height: 148px;
  background: var(--panel);
  border-bottom: 3px solid #152343;
}
.oc__panel > svg {                          /* letterbox: taşmaz, ortalanır */
  position: absolute;
  top: 14px; left: 16px;
  width: calc(100% - 32px);
  height: calc(100% - 28px);
}

/* Alt yarı: metin */
.oc__body {
  display: flex; flex-direction: column; justify-content: center;
  gap: 7px; padding: 18px 20px 20px;
}
.oc__eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 12px; font-weight: 600; letter-spacing: .2em;
  text-transform: uppercase; color: var(--tone);
}
.oc__eyebrow::before {
  content: ""; width: 22px; height: 3px; border-radius: 2px; background: currentColor;
}
.oc__title {
  margin: 0; font-family: Fredoka, ui-sans-serif, sans-serif; font-weight: 600;
  font-size: 1.45rem;   /* akışkan sayfada: clamp(1.25rem, 2.2vw, 1.65rem) */
  line-height: 1.15; letter-spacing: -.02em;
}
.oc__desc { margin: 0; font-size: 15px; line-height: 1.5; color: #5B6480; }
.oc__link {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
  font-family: Fredoka, ui-sans-serif, sans-serif; font-weight: 500;
  font-size: 14.5px; color: var(--tone);
}

/* Yatay varyant: panel sola geçer */
.oc--wide { display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); width: 780px; }
.oc--wide .oc__panel { flex: none; min-height: 168px; border-bottom: 0; border-right: 3px solid #152343; }
</style>

<a class="oc" href="#" style="--tone:#CE3B5F; --panel:#FFD6DE;">
  <div class="oc__panel">
    <!-- 5. bölümdeki sahnelerden biri buraya -->
  </div>
  <div class="oc__body">
    <span class="oc__eyebrow">ÇIKTI 03</span>
    <h3 class="oc__title">Oyun</h3>
    <p class="oc__desc">Kuralları o koyuyor. Sonunda arkadaşı oturup oynuyor.</p>
    <span class="oc__link">Öğrencilerin işlerini gör
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </span>
  </div>
</a>
```

---

## 5 — Üst yarıdaki altı sahne (birebir SVG)

Hepsi aynı `320×190` viewBox'ı paylaşıyor, o yüzden dar hücreyle geniş hücre
aynı çizimi farklı boyda gösterebiliyor. Aşağıdakileri olduğu gibi
`.oc__panel` içine yapıştır.

### ÇIKTI 01 — Web sitesi (gerçek bir tarayıcı penceresi, içinde gerçek bir sayfa)

```html
<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
  <rect x="44" y="24" width="232" height="144" rx="15" fill="#FFFBF2" stroke="#152343" stroke-width="5"/>
  <path d="M44 56h232" stroke="#152343" stroke-width="5"/>
  <circle cx="61" cy="40" r="4.5" fill="#FF6B8A"/>
  <circle cx="77" cy="40" r="4.5" fill="#FF9F45"/>
  <circle cx="93" cy="40" r="4.5" fill="#2FD08A"/>
  <rect x="112" y="35" width="112" height="11" rx="5.5" fill="#E7DCC6"/>
  <rect x="62" y="70" width="86" height="15" rx="7.5" fill="#3D5FE0"/>
  <rect x="62" y="94" width="132" height="8" rx="4" fill="#E7DCC6"/>
  <rect x="62" y="108" width="104" height="8" rx="4" fill="#E7DCC6"/>
  <rect x="62" y="128" width="60" height="24" rx="12" fill="#FF9F45" stroke="#152343" stroke-width="4"/>
  <rect x="130" y="128" width="60" height="24" rx="12" fill="#FFFBF2" stroke="#152343" stroke-width="4"/>
  <rect x="210" y="70" width="52" height="52" rx="12" fill="#8B6BFF" stroke="#152343" stroke-width="4"/>
  <circle cx="224" cy="84" r="5" fill="#FFFBF2" opacity="0.7"/>
  <path d="M214 114l12-14 10 11 8-8 14 15z" fill="#FFFBF2" opacity="0.55"/>
  <!-- imleç, birincil butona basmak üzere -->
  <path d="M170 146v28l7.5-7.5 5.5 12 7-3.2-5.6-11.8H196z"
        fill="#FFFBF2" stroke="#152343" stroke-width="4" stroke-linejoin="round"/>
</svg>
```

### ÇIKTI 02 — Konuşan avatar (ekranda bir karakter, cümlenin ortasında)

```html
<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
  <rect x="62" y="18" width="196" height="132" rx="18" fill="#101B38" stroke="#152343" stroke-width="5"/>
  <!-- büst, alttan yukarı: her katmanın konturunu bir üstteki kapatıyor -->
  <path d="M128 150c0-20 14-32 32-32s32 12 32 32z" fill="#2FD08A" stroke="#152343" stroke-width="4" stroke-linejoin="round"/>
  <rect x="134" y="48" width="52" height="58" rx="21" fill="#FFD9A8" stroke="#152343" stroke-width="4"/>
  <path d="M132 74v-8a28 26 0 0 1 56 0v8c-5-13-15-19-28-19s-23 6-28 19z" fill="#8B6BFF" stroke="#152343" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="150" cy="78" r="4.2" fill="#152343"/>
  <circle cx="170" cy="78" r="4.2" fill="#152343"/>
  <path d="M151 91q9 8 18 0" stroke="#152343" stroke-width="4" stroke-linecap="round"/>
  <!-- ses çubukları: "konuşuyor"u söyleyen şey bunlar -->
  <rect x="86"  y="78" width="9" height="20" rx="4.5" fill="#7C89AE"/>
  <rect x="99"  y="69" width="9" height="38" rx="4.5" fill="#FF9F45"/>
  <rect x="112" y="74" width="9" height="28" rx="4.5" fill="#7C89AE"/>
  <rect x="208" y="74" width="9" height="28" rx="4.5" fill="#FF9F45"/>
  <rect x="221" y="69" width="9" height="38" rx="4.5" fill="#7C89AE"/>
  <rect x="234" y="78" width="9" height="20" rx="4.5" fill="#FF9F45"/>
  <rect x="112" y="162" width="96" height="16" rx="8" fill="#FF9F45" stroke="#152343" stroke-width="4"/>
</svg>
```

### ÇIKTI 03 — Oyun (platform oyunu, zıplama anında, skorlu)

```html
<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
  <rect x="50" y="20" width="220" height="150" rx="17" fill="#101B38" stroke="#152343" stroke-width="5"/>
  <rect x="66" y="38" width="46" height="13" rx="6.5" fill="#2FD08A" stroke="#152343" stroke-width="3.5"/>
  <rect x="122" y="40" width="9" height="9" rx="2" fill="#FF9F45"/>
  <rect x="136" y="40" width="9" height="9" rx="2" fill="#FF9F45"/>
  <rect x="150" y="40" width="9" height="9" rx="2" fill="#39456B"/>
  <rect x="68"  y="128" width="66" height="13" rx="6.5" fill="#3D5FE0" stroke="#152343" stroke-width="3.5"/>
  <rect x="158" y="104" width="66" height="13" rx="6.5" fill="#3D5FE0" stroke="#152343" stroke-width="3.5"/>
  <rect x="112" y="72"  width="50" height="13" rx="6.5" fill="#3D5FE0" stroke="#152343" stroke-width="3.5"/>
  <rect x="86" y="94" width="30" height="30" rx="10" fill="#FF6B8A" stroke="#152343" stroke-width="4"/>
  <circle cx="95" cy="106" r="3.2" fill="#152343"/>
  <circle cx="107" cy="106" r="3.2" fill="#152343"/>
  <path d="M96 116q5 5 10 0" stroke="#152343" stroke-width="3" stroke-linecap="round"/>
  <circle cx="191" cy="80" r="12" fill="#FF9F45" stroke="#152343" stroke-width="4"/>
  <circle cx="191" cy="80" r="4" fill="#152343" opacity="0.25"/>
  <path d="M137 52l3.4 9.2 9.2 3.4-9.2 3.4-3.4 9.2-3.4-9.2-9.2-3.4 9.2-3.4z"
        fill="#FFD27A" stroke="#152343" stroke-width="3" stroke-linejoin="round"/>
</svg>
```

### ÇIKTI 04 — Afiş (bitmiş bir poster, duvara asılmış gibi hafif eğik)

```html
<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
  <circle cx="64"  cy="50"  r="17" fill="#FF6B8A" stroke="#152343" stroke-width="4"/>
  <circle cx="258" cy="132" r="14" fill="#2FD08A" stroke="#152343" stroke-width="4"/>
  <circle cx="252" cy="44"  r="9"  fill="#3D5FE0" stroke="#152343" stroke-width="3.5"/>
  <g transform="rotate(-5 160 95)">
    <rect x="102" y="22" width="116" height="146" rx="11" fill="#FFFBF2" stroke="#152343" stroke-width="5"/>
    <circle cx="160" cy="70" r="29" fill="#FF9F45"/>
    <path d="M112 130l26-32 20 24 16-18 26 30z" fill="#8B6BFF"/>
    <path d="M112 130h88" stroke="#152343" stroke-width="4" stroke-linecap="round"/>
    <rect x="114" y="140" width="62" height="9" rx="4.5" fill="#152343" opacity="0.75"/>
    <rect x="114" y="154" width="38" height="7" rx="3.5" fill="#152343" opacity="0.35"/>
  </g>
</svg>
```

### ÇIKTI 05 — Müzik (çalan bir parça — jenerik dalga formu değil)

```html
<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
  <rect x="40" y="26" width="240" height="138" rx="17" fill="#101B38" stroke="#152343" stroke-width="5"/>
  <rect x="60"  y="99"  width="11" height="26" rx="5.5" fill="#FF9F45"/>
  <rect x="79"  y="86"  width="11" height="52" rx="5.5" fill="#8B6BFF"/>
  <rect x="98"  y="93"  width="11" height="38" rx="5.5" fill="#2FD08A"/>
  <rect x="117" y="73"  width="11" height="78" rx="5.5" fill="#FF9F45"/>
  <rect x="136" y="82"  width="11" height="60" rx="5.5" fill="#8B6BFF"/>
  <rect x="155" y="66"  width="11" height="92" rx="5.5" fill="#2FD08A"/>
  <rect x="174" y="90"  width="11" height="44" rx="5.5" fill="#FF9F45"/>
  <rect x="193" y="78"  width="11" height="68" rx="5.5" fill="#8B6BFF"/>
  <rect x="212" y="95"  width="11" height="34" rx="5.5" fill="#2FD08A"/>
  <rect x="231" y="84"  width="11" height="56" rx="5.5" fill="#FF9F45"/>
  <rect x="250" y="100" width="11" height="24" rx="5.5" fill="#8B6BFF"/>
  <rect x="60" y="134" width="200" height="7" rx="3.5" fill="#39456B"/>
  <rect x="60" y="134" width="118" height="7" rx="3.5" fill="#FF9F45"/>
  <circle cx="178" cy="137.5" r="9" fill="#FFFBF2" stroke="#152343" stroke-width="4"/>
  <path d="M196 44v34a12 10 0 1 1-8-9.4V52l30-7v30a12 10 0 1 1-8-9.4V38z"
        fill="#FF9F45" stroke="#152343" stroke-width="4" stroke-linejoin="round"/>
</svg>
```

### ÇIKTI 06 — Video (klaket ve yanında bitmiş kurgu)

```html
<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
  <rect x="30" y="52" width="148" height="108" rx="14" fill="#101B38" stroke="#152343" stroke-width="5"/>
  <path d="M30 52l6-24 146 14-6 24z" fill="#FFFBF2" stroke="#152343" stroke-width="5" stroke-linejoin="round"/>
  <path d="M52 30l-9 26 14 1.4 9-26z"    fill="#152343" opacity="0.85"/>
  <path d="M86 31.6l-9 26 14 1.4 9-26z"  fill="#152343" opacity="0.85"/>
  <path d="M120 33.2l-9 26 14 1.4 9-26z" fill="#152343" opacity="0.85"/>
  <path d="M154 34.8l-9 26 14 1.4 9-26z" fill="#152343" opacity="0.85"/>
  <rect x="48" y="78"  width="82" height="9"  rx="4.5" fill="#39456B"/>
  <rect x="48" y="96"  width="58" height="9"  rx="4.5" fill="#39456B"/>
  <rect x="48" y="128" width="46" height="18" rx="9"   fill="#FF6B8A" stroke="#152343" stroke-width="4"/>
  <circle cx="240" cy="104" r="34" fill="#FF9F45" stroke="#152343" stroke-width="5"/>
  <path d="M231 90l22 14-22 14z" fill="#152343" stroke-linejoin="round"/>
  <path d="M282 40l3.6 9.8 9.8 3.6-9.8 3.6-3.6 9.8-3.6-9.8-9.8-3.6 9.8-3.6z"
        fill="#2FD08A" stroke="#152343" stroke-width="3.5" stroke-linejoin="round"/>
</svg>
```

---

## 6 — Yeni sahne çizme kuralları

Aynı dilde yeni bir çizim gerekiyorsa (başka bir çıktı, başka bir konu) şunlara
uy — sahneler bu yüzden altı ayrı resim değil, tek bir set gibi duruyor.

**Palet (bu sekiz renk, ara ton yok):**

| Rol | Hex |
|---|---|
| Kontur ve koyu dolgu | `#152343` |
| Kâğıt (açık yüzey) | `#FFFBF2` |
| Kâğıt, soluk (dolgu metni, pasif alan) | `#E7DCC6` |
| Ekran (koyu cihaz içi) | `#101B38` |
| Ekran içi gri (pasif çubuk) | `#39456B` · ses için `#7C89AE` |
| Mavi | `#3D5FE0` · Amber `#FF9F45` · Mint `#2FD08A` · Mercan `#FF6B8A` · Menekşe `#8B6BFF` |
| Ten tonu (sadece karakter) | `#FFD9A8` · yıldız içi `#FFD27A` |

**Kalınlık hiyerarşisi** — derinlik buradan geliyor:

- `5` → sahnenin ana çerçevesi (pencere, ekran, poster).
- `4` → çerçevenin içindeki nesneler (buton, kafa, oynat düğmesi).
- `3.5` / `3` → küçük parçalar, rozetler, yıldızlar.
- Konturu olmayan parçalar: metin yerine geçen çubuklar, ekran içi dolgular.
  Ekranın **içindeki** her şeye kontur çizilmez, yoksa görüntü kalabalıklaşır.

**Kompozisyon:**

- 320×190 alanın içinde kal, kenarlardan ~20px boşluk bırak. Sahne dar hücrede
  de geniş hücrede de aynı; kırpma yok.
- Tek bir kahraman nesne + en fazla iki küçük aksan (yıldız, top, daire).
  Sahne bir "ikon seti" değil, tek bir an.
- **Sahne bir sonucu göstersin, bir arayüzü değil.** Web sitesi kartında
  tel-kafes değil gerçek bir sayfa var; video kartında "video ikonu" değil
  klaket + oynatılan kurgu var. Kutu-çizgi wireframe "görsel gelecek" diye
  okunur, bölümün iddiasının tam tersi.
- Bir hareket ipucu ekle: imleç tıklamak üzere, karakter zıplama anında,
  şarkı çalıyor. Duran sahne ölü görünüyor.
- Yıldız gerekiyorsa dört uçlu parlama şekli kullan (yukarıdaki `path`'i
  kopyala), emoji ya da beş köşeli klasik yıldız değil.

---

## 7 — Yapılmayacaklar

- Gradyan. Hiçbir yerde, sahnenin içinde de.
- Yumuşak/blurlu gölge. Gölge daima sert ve ofset.
- Saf siyah (`#000`) ya da saf beyaz (`#FFF`). Kontur `#152343`, beyaz `#FFFBF2`.
- Kartın içine ikinci bir vurgu rengi (panel dışı). Kart tek renkli okunur.
- Panelin içine fotoğraf, stok görsel ya da ekran görüntüsü. Sadece bu dilde
  çizilmiş düz vektör sahne.
- Emoji, ikon kütüphanesi ikonu, ince çizgili (1–2px) ikon stili.
- Kartı deforme etmek: konturu sabit tutup kartı büyütmek, köşe yarıçapını
  ölçekten koparmak.
