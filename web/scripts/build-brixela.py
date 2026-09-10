"""Derive a web-ready Brixela from the demo TTF.

Usage: uv run --with fonttools --with brotli python scripts/build-brixela.py <BrixelaDemoRegular.ttf>

The demo ships 57 glyphs: A–Z, a–z, space, comma, period. The greeting
"Merhaba, ne üretiyoruz?" needs ü and ?, neither of which exists, and the
browser would otherwise paint those two characters in the fallback face.
Everything added here is built from the font's own parts (u + the tittle of
i, the period as the dot of ?), or drawn with its stem (80) and corner
(170 outer / 110 inner) in the style of o. Nothing is subset: the file is
~15 KB either way.
"""
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib.tables._c_m_a_p import cmap_format_4

import sys, os
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "fonts", "brixela-nebula")
t = TTFont(SRC)
glyf, hmtx, cmap = t["glyf"], t["hmtx"], t["cmap"]
order = t.getGlyphOrder()

def copy_contours(pen, name, dx=0, dy=0, only=None):
    """Draw glyph `name`'s outline into `pen`, shifted, optionally one contour."""
    g = glyf[name]
    coords, ends, flags = g.getCoordinates(glyf)
    start = 0
    for ci, e in enumerate(ends):
        if only is not None and ci != only:
            start = e + 1
            continue
        pts = [(coords[i][0] + dx, coords[i][1] + dy, bool(flags[i] & 1)) for i in range(start, e + 1)]
        start = e + 1
        # rotate so the contour starts on an on-curve point
        k = next(i for i, p in enumerate(pts) if p[2])
        pts = pts[k:] + pts[:k]
        pen.moveTo(pts[0][:2])
        off = []
        for x, y, on in pts[1:] + [pts[0]]:
            if on:
                if off:
                    pen.qCurveTo(*off, (x, y)); off = []
                else:
                    pen.lineTo((x, y))
            else:
                off.append((x, y))
        pen.closePath()

def dot(pen, cx, cy, d=100):
    """A tittle like i's: circle of diameter d centred at (cx, cy)."""
    r = d / 2; k = 0.29 * d  # i's dot: on-points at cardinal, off at corners
    pen.moveTo((cx - r, cy))
    pen.qCurveTo((cx - r, cy + k * 0.72), (cx - k * 0.72, cy + r), (cx, cy + r))
    pen.qCurveTo((cx + k * 0.72, cy + r), (cx + r, cy + k * 0.72), (cx + r, cy))
    pen.qCurveTo((cx + r, cy - k * 0.72), (cx + k * 0.72, cy - r), (cx, cy - r))
    pen.qCurveTo((cx - k * 0.72, cy - r), (cx - r, cy - k * 0.72), (cx - r, cy))
    pen.closePath()

new = {}  # name -> (glyph, advance, lsb, codepoints)

def add(name, codes, draw, adv):
    pen = TTGlyphPen(None)
    draw(pen)
    g = pen.glyph(); g.recalcBounds(glyf)
    new[name] = (g, adv, g.xMin, codes)

# --- dieresis on u / U / o / O: dots centred over the two stems ---------------
def diaeresis(base, stems, y):
    def draw(pen):
        copy_contours(pen, base)
        for cx in stems: dot(pen, cx, y)
    return draw
add("udieresis", [0xFC], diaeresis("u", (100, 340), 660), hmtx["u"][0])
add("odieresis", [0xF6], diaeresis("o", (100, 410), 660), hmtx["o"][0])
add("Udieresis", [0xDC], diaeresis("U", (110, 450), 815), hmtx["U"][0])
add("Odieresis", [0xD6], diaeresis("O", (110, 530), 815), hmtx["O"][0])
# --- dotless i: i's stem alone; dotted I: I plus a tittle ----------------------
add("dotlessi", [0x131], lambda p: copy_contours(p, "i", only=0), hmtx["i"][0])
add("Idotaccent", [0x130], lambda p: (copy_contours(p, "I"), dot(p, 210, 815)), hmtx["I"][0])

# --- question mark: o's top, a joint into a centred stem, the period as dot ----
def question(pen):
    pen.moveTo((290, 700))
    pen.qCurveTo((460, 700), (460, 530))     # outer top-right corner
    pen.lineTo((460, 400))
    pen.qCurveTo((460, 260), (320, 260))     # outer joint corner
    pen.lineTo((295, 260))
    pen.lineTo((295, 190))                   # stem, right edge, down
    pen.lineTo((215, 190))
    pen.lineTo((215, 340))                   # stem, left edge, up
    pen.lineTo((320, 340))
    pen.qCurveTo((380, 340), (380, 400))     # inner joint corner
    pen.lineTo((380, 510))
    pen.qCurveTo((380, 620), (270, 620))     # inner top-right corner
    pen.lineTo((240, 620))
    pen.qCurveTo((130, 620), (130, 510))     # inner top-left corner
    pen.lineTo((130, 470))
    pen.lineTo((50, 470))                    # end of the left tail
    pen.lineTo((50, 530))
    pen.qCurveTo((50, 700), (220, 700))      # outer top-left corner
    pen.closePath()
    copy_contours(pen, "period", dx=160)     # 50..140 -> 210..300, under the stem
add("question", [0x3F], question, hmtx["o"][0])

def exclam(pen):
    pen.moveTo((150, 700)); pen.lineTo((230, 700)); pen.lineTo((230, 190)); pen.lineTo((150, 190)); pen.closePath()
    copy_contours(pen, "period", dx=95)      # centred under the stem (190)
add("exclam", [0x21], exclam, hmtx["i"][0])

# --- register -----------------------------------------------------------------
for name, (g, adv, lsb, codes) in new.items():
    order.append(name)
    glyf[name] = g
    hmtx[name] = (adv, lsb)
t.setGlyphOrder(order)
glyf.glyphOrder = order

# cmap: keep the two format-4 tables (0,3) and (3,1); drop the mac format-6 one,
# which cannot hold anything outside a contiguous range.
keep = []
for sub in cmap.tables:
    if sub.format == 6: continue
    for name, (_, _, _, codes) in new.items():
        for c in codes: sub.cmap[c] = name
    keep.append(sub)
cmap.tables = keep

# name: mark the derivative so nobody mistakes it for the vendor's file
nm = t["name"]
for rec in nm.names:
    s = rec.toUnicode()
    if "Brixela DEMO" in s: nm.setName(s.replace("Brixela DEMO", "Brixela Nebula"), rec.nameID, rec.platformID, rec.platEncID, rec.langID)
    if rec.nameID == 6: nm.setName("BrixelaNebula-Regular", 6, rec.platformID, rec.platEncID, rec.langID)

t.flavor = "woff2"
t.save(OUT + ".woff2")
print("ok", len(order), "glyphs")
