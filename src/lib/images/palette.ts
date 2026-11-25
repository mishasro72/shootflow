/**
 * The main colours of a photo, for the "Palette from photo" card. Works on raw RGBA
 * pixels (from a canvas), so it runs in the browser and is easy to test without one.
 *
 * 1. Pixels go into a coarse histogram: 16 levels per channel, 4096 bins. Each bin keeps
 *    how many pixels fell in and their average colour.
 * 2. k-means picks `count` centres among the bins, weighted by size. The first centre is
 *    the biggest bin, each next one the bin that is far from all centres and still big
 *    (k-means++ without randomness, so the same photo always gives the same palette).
 * 3. Centres closer than a just-visible difference are merged; the biggest come first.
 */

type Bin = { r: number; g: number; b: number; n: number };

const MERGE_DISTANCE = 24; // in RGB units; smaller differences look like the same colour
const ITERATIONS = 8;

const dist2 = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

const hex = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");

function histogram(pixels: Uint8ClampedArray | Uint8Array): Bin[] {
  const bins = new Map<number, Bin>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i] as number;
    const g = pixels[i + 1] as number;
    const b = pixels[i + 2] as number;
    if ((pixels[i + 3] as number) < 128) continue; // transparent: not part of the picture
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key);
    if (bin) {
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bin.n += 1;
    } else bins.set(key, { r, g, b, n: 1 });
  }
  return [...bins.values()].map((bin) => ({ r: bin.r / bin.n, g: bin.g / bin.n, b: bin.b / bin.n, n: bin.n }));
}

/** Up to `count` colours as "#rrggbb", the most common first; [] for an empty picture. */
export function extractPalette(pixels: Uint8ClampedArray | Uint8Array, count = 5): string[] {
  const bins = histogram(pixels);
  if (bins.length === 0) return [];

  // Seeding: biggest bin first, then the bin with the best "far and big" score.
  const sorted = [...bins].sort((a, b) => b.n - a.n);
  const centres: Bin[] = [{ ...(sorted[0] as Bin) }];
  while (centres.length < count) {
    let best: Bin | null = null;
    let bestScore = 0;
    for (const bin of bins) {
      const nearest = Math.min(...centres.map((centre) => dist2(bin, centre)));
      const score = nearest * bin.n;
      if (score > bestScore) {
        best = bin;
        bestScore = score;
      }
    }
    if (!best) break; // every bin is already a centre: the picture has few colours
    centres.push({ ...best });
  }

  // k-means, weighted by bin size.
  for (let round = 0; round < ITERATIONS; round += 1) {
    const sums = centres.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (const bin of bins) {
      let index = 0;
      for (let c = 1; c < centres.length; c += 1) {
        if (dist2(bin, centres[c] as Bin) < dist2(bin, centres[index] as Bin)) index = c;
      }
      const sum = sums[index] as Bin;
      sum.r += bin.r * bin.n;
      sum.g += bin.g * bin.n;
      sum.b += bin.b * bin.n;
      sum.n += bin.n;
    }
    sums.forEach((sum, c) => {
      centres[c] =
        sum.n > 0
          ? { r: sum.r / sum.n, g: sum.g / sum.n, b: sum.b / sum.n, n: sum.n }
          : { ...(centres[c] as Bin), n: 0 };
    });
  }

  // Merge near-duplicates into the bigger one, biggest first.
  const result: Bin[] = [];
  for (const centre of centres.filter((c) => c.n > 0).sort((a, b) => b.n - a.n)) {
    if (!result.some((kept) => dist2(kept, centre) < MERGE_DISTANCE ** 2)) result.push(centre);
  }
  return result.map((c) => `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`);
}
