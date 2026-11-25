import { describe, expect, it } from "vitest";

import { decodeEntities, imageTypeOf, normalizeLinkUrl, parseLinkPreview, siteOf } from "./preview";

describe("normalizeLinkUrl", () => {
  it("adds https:// to an address typed without it and drops the #fragment", () => {
    expect(normalizeLinkUrl(" pinterest.com/pin/123 ")).toBe("https://pinterest.com/pin/123");
    expect(normalizeLinkUrl("http://example.com/a?b=1#top")).toBe("http://example.com/a?b=1");
  });

  it("refuses what is not a web page anyone can open", () => {
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("ftp://example.com/file")).toBeNull();
    expect(normalizeLinkUrl("https://user:secret@example.com/")).toBeNull();
    expect(normalizeLinkUrl("https://photos/")).toBeNull();
    expect(normalizeLinkUrl("two words")).toBeNull();
    expect(normalizeLinkUrl("")).toBeNull();
    expect(normalizeLinkUrl(`https://example.com/${"a".repeat(2100)}`)).toBeNull();
  });

  it("keeps IP addresses: whether they are public is checked when fetching", () => {
    expect(normalizeLinkUrl("http://127.0.0.1:3000/x")).toBe("http://127.0.0.1:3000/x");
  });
});

describe("siteOf", () => {
  it("shows the host without www", () => {
    expect(siteOf("https://www.pinterest.com/pin/1")).toBe("pinterest.com");
    expect(siteOf("https://vogue.ru/")).toBe("vogue.ru");
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Tom &amp; Jerry &#39;24 &#x2014; &quot;ok&quot;")).toBe("Tom & Jerry '24 — \"ok\"");
    expect(decodeEntities("&unknown; &#0;")).toBe("&unknown; &#0;");
  });
});

describe("parseLinkPreview", () => {
  const page = "https://example.com/looks/linen";

  it("reads Open Graph tags, in either attribute order, and makes the picture absolute", () => {
    const html = `<!doctype html><html><head>
      <title>Fallback</title>
      <meta property="og:title" content="Linen &amp; light">
      <meta content="Soft summer looks" property="og:description" />
      <meta property='og:image' content='/img/linen.jpg'>
      <meta property="og:site_name" content="Example Mag">
      </head><body><meta property="og:title" content="Not in head"></body></html>`;
    expect(parseLinkPreview(html, page)).toEqual({
      title: "Linen & light",
      description: "Soft summer looks",
      image: "https://example.com/img/linen.jpg",
      site: "Example Mag",
    });
  });

  it("falls back to Twitter tags and <title>", () => {
    const html = `<head><title> Plain   title </title><meta name="twitter:image" content="https://cdn.example.com/a.png"></head>`;
    expect(parseLinkPreview(html, page)).toEqual({
      title: "Plain title",
      description: null,
      image: "https://cdn.example.com/a.png",
      site: null,
    });
  });

  it("ignores pictures that are not web addresses", () => {
    const html = `<head><meta property="og:image" content="javascript:alert(1)"></head>`;
    expect(parseLinkPreview(html, page).image).toBeNull();
  });
});

describe("imageTypeOf", () => {
  it("tells the picture type by its first bytes", () => {
    expect(imageTypeOf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageTypeOf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(imageTypeOf(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(imageTypeOf(new TextEncoder().encode("GIF89a..."))).toBe("image/gif");
  });

  it("refuses HTML or SVG that only calls itself an image", () => {
    expect(imageTypeOf(new TextEncoder().encode("<!doctype html>"))).toBeNull();
    expect(imageTypeOf(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });
});
