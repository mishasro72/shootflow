// @vitest-environment node
// Node's Blob reads bytes like a browser does; jsdom's Blob cannot.
import { describe, expect, it } from "vitest";

import { isHeicFile, isHeicHeader } from "./heic";

const header = (brand: string) => new Uint8Array([0, 0, 0, 24, ...Buffer.from(`ftyp${brand}`)]);

describe("isHeicHeader", () => {
  it("recognises iPhone and generic HEIF brands", () => {
    expect(isHeicHeader(header("heic"))).toBe(true);
    expect(isHeicHeader(header("heix"))).toBe(true);
    expect(isHeicHeader(header("mif1"))).toBe(true);
  });

  it("does not mistake other ISO files or JPEG for HEIC", () => {
    expect(isHeicHeader(header("isom"))).toBe(false); // MP4 video
    expect(isHeicHeader(header("avif"))).toBe(false); // AVIF, which browsers open
    expect(isHeicHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
    expect(isHeicHeader(new Uint8Array([0, 0, 0]))).toBe(false);
  });
});

describe("isHeicFile", () => {
  it("reads only the first bytes of the file", async () => {
    const file = new Blob([header("heic"), new Uint8Array(1000)]);
    expect(await isHeicFile(file)).toBe(true);
    expect(await isHeicFile(new Blob(["just text, not a photo"]))).toBe(false);
  });
});
