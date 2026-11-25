import { describe, expect, it } from "vitest";

import { extractPalette } from "./palette";

/** RGBA pixels: `n` pixels of each colour, in order. */
function pixels(...parts: [r: number, g: number, b: number, n: number, a?: number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [r, g, b, n, a = 255] of parts) for (let i = 0; i < n; i += 1) out.push(r, g, b, a);
  return new Uint8ClampedArray(out);
}

describe("extractPalette", () => {
  it("finds the colours of a simple picture, the most common first", () => {
    expect(extractPalette(pixels([0, 0, 255, 30], [255, 0, 0, 70]))).toEqual(["#ff0000", "#0000ff"]);
  });

  it("returns at most `count` distinct colours, as #rrggbb", () => {
    const gradient: [number, number, number, number][] = [];
    for (let v = 0; v < 256; v += 4) gradient.push([v, 255 - v, (v * 3) % 256, 10]);
    const palette = extractPalette(pixels(...gradient), 5);
    expect(palette.length).toBeGreaterThan(1);
    expect(palette.length).toBeLessThanOrEqual(5);
    for (const colour of palette) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(palette).size).toBe(palette.length);
  });

  it("merges shades that look the same", () => {
    expect(extractPalette(pixels([200, 100, 50, 50], [204, 102, 52, 50]))).toHaveLength(1);
  });

  it("ignores transparent pixels", () => {
    expect(extractPalette(pixels([10, 20, 30, 40], [255, 255, 255, 400, 0]))).toEqual(["#0a141e"]);
    expect(extractPalette(pixels([255, 255, 255, 10, 0]))).toEqual([]);
  });

  it("gives the same palette for the same picture", () => {
    const picture = pixels([12, 80, 160, 20], [240, 200, 120, 50], [30, 30, 30, 15], [180, 40, 60, 25]);
    expect(extractPalette(picture)).toEqual(extractPalette(picture));
  });
});
