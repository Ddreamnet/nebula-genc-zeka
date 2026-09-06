# Handoff: Nebula Genç Zeka — Hero + Bülten bölümü

## Overview

Two sections of the Nebula Genç Zeka marketing homepage:

1. **Hero** — a cream "paper" field with the wordmark and value proposition on the left, and a space shuttle flying left with a dark, wavy exhaust plume that fills the right side of the frame. Planets, comets and star specks live inside the plume.
2. **04 — Bülten** — presents the weekly PDF newsletter: a fanned deck of four real issue covers, two stat cards, and a list of what every issue contains.

Both are in Turkish. Copy is final.

## About the design files

The files in `reference/` are **design references written in HTML** — prototypes that show intended look and behaviour. They are **not production code to copy directly.**

The task is to **recreate these designs in the target codebase's own environment** (React, Vue, Astro, Next, whatever the project already uses) following its established patterns, component library and styling approach. If the project has no front-end yet, pick the framework that best fits it and implement the designs there.

Two files, same design:

- **`reference/hero-and-bulten.html`** — plain, dependency-free HTML. Open it directly in a browser. **Start here.**
- **`reference/Nebula Ana Sayfa v2.dc.html`** + `reference/support.js` — the full homepage this was extracted from (all 6 sections), in the authoring format. Useful for surrounding context only.

Assets are in `assets/`, and `reference/assets/` holds the copies the standalone file loads.

## Fidelity

**High-fidelity.** Exact colors, typography, spacing and geometry. Recreate pixel-for-pixel using the codebase's existing libraries. Every value below is measured from the working prototype.

The shuttle and the plume are hand-built vector art (inline SVG + a CSS `clip-path`). Lift them verbatim from the reference file — do not attempt to redraw them.

---

## Design tokens

Declared as CSS custom properties on a wrapper element. Copy them into the project's token layer.

### Paper / ink (light sections)

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#F7F0E1` | default page ground |
| `--paper-raised` | `#FFFBF2` | header bar, hero ground |
| `--paper-sunken` | `#EDE3CF` | recessed panels |
| `--paper-line` | `#DCCFB4` | dotted texture on paper |
| `--ink` | `#152343` | body text, all strokes |
| `--ink-soft` | `#5B6480` | secondary text |
| `--ink-faint` | `#8A93AC` | tertiary text |

### Dark ground (inside the plume)

| Token | Value |
| --- | --- |
| `--space` | `#141F3C` |
| `--space-blue` | `#1B3564` |
| `--on-space` | `#F2ECDD` |
| `--on-space-soft` | `#A9B6D4` |

### Accents — the five-color core palette

Each accent is a pastel fill plus a deep tone used for the card's offset shadow and for text.

| Name | Pastel fill | Deep tone | Bright |
| --- | --- | --- | --- |
| Mint | `--pastel-mint` `#C6F1DC` | `--mint-deep` `#17915B` | `--mint` `#2FD08A` |
| Peach | `--pastel-peach` `#FFE1C4` | `--amber-deep` `#D2701A` | `--amber` `#FF9F45` |
| Pink | `--pastel-pink` `#FFD6DE` | `--coral-deep` `#CE3B5F` | `--coral` `#FF6B8A` |
| Blue | `--pastel-blue` `#CFE1FF` | `--blue-deep` `#2437A6` | `--blue` `#3D5FE0` |
| Violet | `--pastel-violet` `#DCD2FF` | `--violet-deep` `#5D3FD1` | `--violet` `#8B6BFF` |

Section background tints: `--tint-mint #E8F4EC`, `--tint-peach #FBEFE1`, `--tint-pink #FBEAEE`, `--tint-blue #E9EFFC`.

### Shape

| Token | Value |
| --- | --- |
| `--stroke` | `3px` |
| `--stroke-color` | `#152343` |
| `--lift` | `6px` |
| `--radius-card` | `22px` |
| `--radius-control` | `16px` |
| `--radius-chip` | `999px` |

**Card pattern** (used everywhere): pastel fill + `3px` solid `#152343` border + `box-shadow: 0 6px 0 0 <deep tone>`. The shadow has **no blur** — it is a hard offset. Hover: `transform: translateY(-4px)`, `transition: transform .16s cubic-bezier(.2,.8,.3,1)`.

### Typography

| Role | Family | Weight | Notes |
| --- | --- | --- | --- |
| Headings | **Fredoka** | 600 | `letter-spacing:-.02em`, `line-height:1.02`, `text-wrap:balance` |
| Body | **Nunito** | 400 / 600 | base `17px`, `line-height:1.6` |
| Eyebrow / label | **IBM Plex Mono** | 600 | `12px`, `letter-spacing:.2em`, uppercase, `white-space:nowrap` |
| Wordmark accents | **Nasalization** | — | "Aşağı kaydır" and the logo lockup only. Not a Google font — the project must supply it; falls back to Fredoka. |

Fredoka, Nunito and IBM Plex Mono load from Google Fonts.

---

## Screen 1 — Header

Fixed bar, full width, above everything.

- `position:fixed; inset:0 0 auto; z-index:50`
- `display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px`
- `padding:15px clamp(18px,5vw,64px)`
- `background-color:var(--paper-raised)` — **no bottom border**

Why a 3-column grid: the nav must be centered **on the page**, not merely between its neighbours. Column 2 holds the nav; column 3 holds the CTA with `justify-content:flex-end`. A flex `space-between` layout would let the nav drift as the CTA's width changes.

**Nav** (`grid-column:2`): `display:flex; justify-content:center; gap:clamp(20px,2.8vw,36px)`. Items: `Ne?`, `Nasıl?`, `AI`, `Bülten`, `Güven` — Nunito 600, `color:var(--ink)`.

**CTA** `Giriş yap`: pill button, `--pastel-peach` fill, 3px ink border, `0 6px 0 0 var(--amber-deep)` shadow, `border-radius:var(--radius-chip)`.

The header carries `data-theme="light"` / `data-navtheme` hooks used to re-tint the bar per section on scroll. Reimplement only if the project wants that behaviour.

---

## Screen 2 — Hero

### Frame

- `position:relative; overflow:hidden`
- `background:#FFFBF2`
- `min-height:clamp(852px,64vw,1010px)`
- One local variable: `--nb-shift: max(0px, calc(300px - 36vw))` — pushes the dark field right on narrow viewports so the text column keeps its width.

### The plume (dark field)

A single absolutely-positioned `div`, clipped to a wavy cone:

```
position:absolute; left:var(--nb-shift); top:0; bottom:0;
width:calc(100% - var(--nb-shift));
clip-path:url(#nbWake);
background:radial-gradient(circle at 62% 26%,#4A2A85 0%,#2E1560 52%,#150931 100%);
```

`#nbWake` is a `clipPath` with `clipPathUnits="objectBoundingBox"` — copy the path verbatim.

**How the shape is built** (needed if it ever has to be regenerated): a straight trend line runs from the nozzle at `(352,400)` to the frame edge in a `1440x820` design space, and the waves are applied as **perpendicular offsets to that line**. The mean opening is therefore exactly linear by construction, so the wobble can never re-introduce a sudden flare. 6.5 periods, amplitude 42 units, `grow` factor 0.42→1.0 so waves are present at the engine but smaller there. Each edge uses its own seed and phase, so the two sides are independent rather than a ribbon.

Inside the field, in paint order:

1. Two darker smoke bands (`#1B0D3E` @ .4, `#150931` @ .44) generated with the same wave function at 80% amplitude, so they undulate *with* the edge.
2. Star specks — 40 white dots, r `0.9–2.1`, opacity `.42–.92`.
3. Ten 4-point sparkles.
4. Ten comet groups (see below).
5. Nine planets.

### Planets

Nine discs, radius 22–160 units, density increasing to the right. Each is:

- a radial-gradient sphere (`cx:35% cy:30% r:78%`) in one of four palettes — violet, magenta, amber, cyan;
- surface patches in a **deeper shade of the planet's own hue** (never a grey overlay — that reads as haze, not landmass), clipped to the sphere;
- a terminator shadow, a specular highlight, and a lit rim arc, all oriented toward the shuttle so the whole field shares one light source;
- 5 patches each: one large continent + 4 islets.

Surface language differs by type: **gas** (amber, violet) gets 4 fixed latitude bands plus one rotating storm oval; **rocky** (magenta) gets continents, islets and lit-rim craters; **ice** (cyan) gets continents and islets. Hairline canyon strokes on all of them.

Three planets carry rings, drawn as a back arc behind the disc and a front arc over it. Five of nine carry a moon.

Continent outlines come from a closed Catmull-Rom walk with **alternating long/short lobe radii** — that is what produces inlets and peninsulas. A plain jittered circle only ever reads as a blob.

### Comets

All comets travel **down-left along one shared 30° axis**; the bright head leads and the tail trails up-right, so direction of travel is legible. Each streak is `rotate(150deg)`.

They are split by role:

- **10 groups inside the field**, emitted *before* the planets so planets occlude them.
- **4 groups in an unclipped overlay** that straddle the plume's edge and spill onto the cream.

The overlay shares the decor SVG's `viewBox` **and** `preserveAspectRatio="xMaxYMid meet"` so both sit in one coordinate space. This matters: the decor SVG scales uniformly and anchors right, while percentage positioning scales x and y differently — mixing the two makes clearance tests pass in one space and fail in the other.

Overlay anchors are only accepted if the whole **swept segment** (±170 units along the axis, plus the streak's own length) clears all nine planet discs and the logo, paragraph and scroll-cue boxes. Measured clearances: +60, +45, +41, +22 units.

### Shuttle

Inline SVG, `viewBox="0 0 200 520"`, drawn nose-up and rotated to fly left:

```
position:absolute;
left:max(calc(24.8vw + 6px), calc(24.44% + var(--nb-shift) * 0.7556));
top:48.78%;
width:clamp(58px,10vw,164px);
transform:translate(-50%,-94.2%) rotate(-90deg);
transform-origin:50% 94.2%;
```

The `transform-origin` at `50% 94.2%` is the **exhaust nozzle**, so the craft pivots about the point where the plume begins and the two stay joined at every size.

**Do not change the anchor's unit.** The rotated nose reaches **2.42x the CSS width** to the left of the anchor. The `max()` floor is expressed in `vw` — the same unit as `width` — because a `%`-of-stage floor against a `vw` size made the nose sit exactly on the frame edge at every width and get clipped. With the current rule, painted left edge is +51px at 640, +12 at 910, +14 at 1440, +84 at 1920.

The craft carries a **Turkish flag** on the fuselage: red field `#E30A17`, white crescent as a two-circle cutout, five-pointed star.

### Warm exhaust core

Five soft-blurred layers in a separate unclipped SVG (`height:100%` — without it the layer collapses to its own aspect ratio and detaches from the nozzle), stacked largest-to-smallest with **strictly rising opacity**:

`#8B5CF6` @.22 → `#E8399B` @.32 → `#F58634` @.56 → `#FBBF3C` @.74 → `#FFF6DE` @.92

Violet and faint at the outside, warmer and brighter inward, near-white at the nozzle, reach 168 units. Getting this order wrong turns the glow into grey fog.

### Crumbs

21 ink-colored specks (`#152343`, mixed 4-point sparkles and round dots, opacity `.34–.78`) scattered on the **cream** side, hugging the plume's edge as if shaken loose. Fixed-px elements at **percentage** positions, so they track the clip's stretch while keeping their own size.

Every position was verified outside the real clip path with `isPointInFill`. If they are ever regenerated, verify the same way — deriving them from edge normals is error-prone.

### Text column

- **Wordmark**: `assets/logo-black.png`, `width:clamp(210px,26vw,392px)`.
- **Paragraph**: `clamp(1.05rem,1.55vw,1.3rem)`, `line-height:1.55`, `color:var(--ink-soft)`, `max-width:560px`, `text-wrap:pretty`.
  > Canlı yapay zeka kullanımı eğitimi. Öğrencilerimiz her derste kendi web sitesini, oyununu, şarkısını veya kısa filmini üretiyor.
- **Scroll cue** (`<a href="#ne-uretiyor">`): a bare chevron — two strokes meeting at a point, no baseline — `stroke-width:2.6`, `stroke-linecap:round`, `color:var(--coral-deep)`, 22–28px; label **Aşağı kaydır** in Nasalization, `letter-spacing:.1em`.

### Bottom seam

A flat `var(--paper)` band: `position:absolute; left:0; right:0; bottom:0; height:clamp(30px,4.6%,64px); z-index:3`. Straight edge — an earlier wavy version competed with the plume, which now runs to the frame edge.

### Animation

| Keyframe | Target | Timing |
| --- | --- | --- |
| `nb-spin` | planet surface groups | `24s + i*2.6s` linear infinite |
| `nb-moon` | moon orbits | `34s + i*4.1s` linear infinite |
| `nb-comet` | in-field comet drift | `14s + i*1.7s` ease-in-out infinite |
| `nb-meteor` | crossing comets | `6.5s + i*0.9s` linear infinite, translate ±170 units on the axis, fading in at 18% and out at 82% |

Only the **surface patches** rotate, never the whole sphere — rotating the sphere rotates its specular highlight too, which makes the planet look like it is tumbling.

All animations read `animation-play-state:var(--nb-play,running)`, so a reduced-motion or pause control can stop everything by setting `--nb-play:paused` on the hero.

---

## Screen 3 — 04 Bülten

### Frame

```
padding:clamp(72px,9vw,132px) clamp(18px,5vw,64px);
background-color:var(--tint-peach);
background-image:radial-gradient(rgba(210,112,26,.16) 1.4px,transparent 1.4px);
background-size:26px 26px;
```

Inner wrapper: `max-width:1180px; margin:0 auto`.

**Adjacency rule:** peach `#FBEFE1` and paper `#F7F0E1` differ by only 4/1/0 per channel — placed next to each other they read as one wall. A warm band must be followed by a cool tint (section 05 uses `--tint-blue`). Keep this in mind if sections are reordered.

### Header block

`max-width:720px; margin-bottom:clamp(30px,3.6vw,46px)`

- Eyebrow: `04 — BÜLTEN`, mono 12px, `.2em`, preceded by a 22px × 3px ink rule, `color:var(--ink-soft)`.
- H2: **Her ders bir sayıyla bitiyor.** — Fredoka 600, `clamp(2rem,5vw,3.3rem)`.
- Paragraph, `max-width:600px`, `color:var(--ink-soft)`:
  > Öğrenci dersten çıkarken o haftanın sayısı panelinde hazır bekliyor: 8–12 sayfalık PDF, o günkü dersle birebir eşleşiyor.

### Two-column body

`display:grid; grid-template-columns:1.06fr .94fr; gap:clamp(26px,3.6vw,52px); align-items:start`

**Left column — the deck.** Container `position:relative; height:clamp(250px,29vw,368px)`. Four covers, each `position:absolute; bottom:0; width:38%`, `border:3px solid #152343`, `border-radius:10px`, `box-shadow:0 6px 0 0 rgba(21,35,67,.26)`, `transform-origin:bottom center`.

| Issue | `left` | `rotate` | `z-index` |
| --- | --- | --- | --- |
| 01 | 48% | 6deg | 4 |
| 02 | 32% | 1deg | 3 |
| 03 | 16% | −4deg | 2 |
| 04 | 0% | −9deg | 1 |

Issue 01 is **in front, at the right**, with 02–04 receding behind it to the left. Hover lifts a card: `rotate(<same>) translateY(-10px)`, `transition:transform .2s cubic-bezier(.2,.8,.3,1)`.

All four images are real renders of the actual PDF issues (`assets/kapak-h01.png` … `kapak-h04.png`), extracted from the source PDFs — not mockups.

**Left column — two stat cards**, below the deck: `display:grid; grid-template-columns:1fr 1fr; gap:clamp(12px,1.6vw,18px); margin-top:clamp(20px,2.6vw,32px)`. Standard card pattern, `padding:20px 20px 18px`.

| Card | Fill | Shadow tone | Big line | Small line |
| --- | --- | --- | --- | --- |
| 1 | `--pastel-peach` | `--amber-deep` | **PDF** | ders sonrası panelde |
| 2 | `--pastel-violet` | `--violet-deep` | **16 sayı** | sonunda ciltlenir |

Big line: Fredoka 600, `clamp(1.6rem,2.6vw,2.2rem)`, `line-height:1`. Small line: mono 12px, `--ink-soft`.

**Right column — "HER SAYIDA" list.** Mono label, then a single vertical `<ul>` (`list-style:none; margin:0; padding:0`). Each `<li>`: `display:flex; align-items:flex-start; gap:12px; padding:14px 0; border-top:1px solid rgba(21,35,67,.16)`, led by an 11px dot in a rotating accent color with a 2px ink border.

| Dot | Title | Description |
| --- | --- | --- |
| `--mint-deep` | Dersin özeti | O hafta ne öğrenildi, hangi araç kullanıldı, öğrenci ne üretti. |
| `--violet-deep` | Kim bu isim? | Bilgisayar tarihinden bir portre — hayatı, işi, bıraktığı iz. |
| `--amber-deep` | Yapay zeka notları | Kısa, şaşırtıcı bilgiler; haftanın konusuna bağlanan ayrıntılar. |
| `--blue-deep` | Zaman tüneli | Geçmişten o haftaya uzanan bir olay, tarihiyle birlikte. |
| `--coral-deep` | Çizgi roman | Eski yazılımcıların hikâyesi. Her sayıda bir bölüm, ayda bir hikâye. |
| `--mint-deep` | Haftanın bulmacası | Labirent, eşleştirme, kelime avı — kalemle çözülen sayfalar. |

Title: Fredoka 600, `clamp(1rem,1.2vw,1.12rem)`. Description: `clamp(.9rem,1.02vw,.99rem)`, `--ink-soft`.

---

## Interactions & behavior

- **Nav / CTA**: hover only, no JS state.
- **Scroll cue**: anchor jump to `#ne-uretiyor`.
- **Cover hover**: lift, preserving each card's own rotation.
- **Stat card hover**: `translateY(-4px)`.
- **Decor animation**: continuous, CSS only. No JS. Pausable via `--nb-play`.
- No loading, error or form states — these are static marketing sections.

## State management

None. Both sections are stateless and render from static content. The only dynamic value is the header's per-section theme, driven by `data-navtheme` on each section if that behaviour is kept.

## Responsive behavior

No media queries. Everything scales through `clamp()` and `vw`, plus the `--nb-shift` variable that keeps the text column intact on narrow screens. Verified from 390px to 1920px; at 390px the layout reflows correctly with no horizontal overflow.

The two-column grids in section 04 do **not** currently collapse to one column on small screens. If the target project wants a mobile-specific stack, that is a decision to make during implementation — the current design deliberately relies on fluid scaling only.

## Copy rules

From the project's own guidelines — please keep them:

- Say **öğrenci**, never "çocuk" (in copy addressing parents directly, "çocuğunuz" is fine).
- The newsletter is shared **as a PDF from the panel**. No shipping or subscription language. The 16 issues are bound at the end of the programme, and that is optional.
- No emoji. No inflated claims.

## Assets

| File | What it is | Source |
| --- | --- | --- |
| `assets/logo-black.png` | Wordmark, dark | project's existing brand assets |
| `assets/logo-white.png` | Wordmark, light — for dark grounds | project's existing brand assets |
| `assets/kapak-h01.png` … `kapak-h04.png` | Issue 1–4 covers | rendered from the real newsletter PDFs |

The shuttle, planets, comets, sparkles and the chevron are all inline SVG in the reference file — no image files.

**Nasalization** is not bundled and is not a Google font. Supply it or accept the Fredoka fallback.

## Files

```
design_handoff_hero_bulten/
├── README.md
├── assets/
│   ├── logo-black.png
│   ├── logo-white.png
│   └── kapak-h01.png … kapak-h04.png
└── reference/
    ├── hero-and-bulten.html      ← open this first
    ├── assets/                    (copies the standalone file loads)
    ├── Nebula Ana Sayfa v2.dc.html  (full homepage, authoring format)
    └── support.js                   (runtime for the .dc.html file)
```
