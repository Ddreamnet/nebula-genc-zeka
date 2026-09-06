/**
 * "Arka planı sil" — a transparent PNG out of a generated sticker, in the
 * browser, for free.
 *
 * Hafta 1's delivery slide tells the class to press a background-remove button
 * ("Aracın hazır 'arka plan sil' düğmesini kullan") and then add the pack to
 * WhatsApp. There was no such button, which made the week's one deliverable
 * impossible to finish in class.
 *
 * This is deliberately NOT a segmentation model. The obvious packages
 * (@imgly/background-removal, RMBG-1.4) are a 5-40MB download on a classroom
 * connection and carry licences that are wrong for a paid product — and they
 * solve a much harder problem than the one we have. Every prompt that reaches
 * this button was written by the lesson's own template, which ends in "sade
 * arka plan" / "tamamen düz ve tek renk arka plan": the background is a flat
 * field touching the border. For that, a border flood fill is both smaller and
 * more accurate than a model.
 *
 * It follows that this is honest about its limits: on a photo, or on a sticker
 * whose background is a gradient or a scene, it will take out only part of it.
 * That is why the caller shows the result on a checkerboard before the student
 * downloads it — they can see what they got.
 */

/** How far a pixel may sit from the sampled background and still be background. */
const DEFAULT_TOLERANCE = 38;

/** Squared euclidean distance in RGB. Squared to avoid a sqrt per pixel. */
function dist2(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * The background colour, taken as the median of the border ring.
 *
 * Median rather than a single corner pixel: generated stickers often carry a
 * little noise or a stray highlight in one corner, and one unlucky sample
 * would either miss the background entirely or eat into the character.
 */
function sampleBackground(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  };
  // Step along the border rather than every pixel of it — 200-odd samples is
  // plenty for a median and keeps this negligible next to the fill.
  const stepX = Math.max(1, Math.floor(w / 50));
  const stepY = Math.max(1, Math.floor(h / 50));
  for (let x = 0; x < w; x += stepX) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += stepY) {
    push(0, y);
    push(w - 1, y);
  }
  const mid = (arr: number[]) => {
    arr.sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)];
  };
  return [mid(rs), mid(gs), mid(bs)];
}

export interface CutoutResult {
  blob: Blob;
  /** Share of the picture that was removed, 0-1 — the caller warns on extremes. */
  removed: number;
}

/**
 * Loads `src`, clears the background-coloured region connected to the border,
 * and returns a PNG.
 *
 * Returns null when the picture can't be read pixel by pixel — a cross-origin
 * image without CORS headers taints the canvas and `getImageData` throws. That
 * is a real possibility for a storage URL, so it is a normal outcome here, not
 * an exception to swallow silently: the caller tells the student rather than
 * appearing to do nothing.
 */
export async function cutOutBackground(src: string, tolerance = DEFAULT_TOLERANCE): Promise<CutoutResult | null> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = src;
  });
  if (!img) return null;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);

  let image: ImageData;
  try {
    image = ctx.getImageData(0, 0, w, h);
  } catch {
    return null; // tainted canvas — see the note above
  }

  const data = image.data;
  const [br, bg, bb] = sampleBackground(data, w, h);
  const limit = tolerance * tolerance;

  // Flood fill inward from every border pixel. Connectivity is the whole point:
  // a plain colour key would also punch holes wherever the character happens to
  // use the background's colour — a white shirt on a white ground, which the
  // lesson's own "kalın beyaz kenarlık" makes likely.
  const n = w * h;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  const consider = (idx: number) => {
    if (seen[idx]) return;
    const p = idx * 4;
    if (dist2(data[p], data[p + 1], data[p + 2], br, bg, bb) > limit) return;
    seen[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < w; x++) {
    consider(x);
    consider((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    consider(y * w);
    consider(y * w + w - 1);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0) consider(idx - 1);
    if (x < w - 1) consider(idx + 1);
    if (y > 0) consider(idx - w);
    if (y < h - 1) consider(idx + w);
  }

  // Soften the cut. A hard mask leaves a one-pixel fringe of background colour
  // all the way round, which reads as a dirty halo once the sticker is dropped
  // on a coloured chat bubble. Any kept pixel touching a cleared one gets half
  // alpha, which is enough to hide it at sticker size.
  const edge = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (seen[idx]) continue;
      const touches =
        (x > 0 && seen[idx - 1]) ||
        (x < w - 1 && seen[idx + 1]) ||
        (y > 0 && seen[idx - w]) ||
        (y < h - 1 && seen[idx + w]);
      if (touches) edge[idx] = 1;
    }
  }

  let cleared = 0;
  for (let idx = 0; idx < n; idx++) {
    if (seen[idx]) {
      data[idx * 4 + 3] = 0;
      cleared++;
    } else if (edge[idx]) {
      data[idx * 4 + 3] = Math.round(data[idx * 4 + 3] * 0.5);
    }
  }

  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return { blob, removed: cleared / n };
}
