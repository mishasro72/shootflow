/**
 * Link cards: what a pasted address may be, and what we read from the page. Plain
 * functions, no network, so they are easy to test; the fetching is in safe-fetch.ts.
 */

export const MAX_URL_LENGTH = 2048;

/**
 * The address as we will fetch and show it, or null. "pinterest.com/pin/1" gets
 * "https://"; only http and https are links, and an address with a login inside
 * ("https://user:pass@…") is refused, so it never ends up on a client's screen.
 */
export function normalizeLinkUrl(input: string): string | null {
  const text = input.trim();
  if (!text || text.length > MAX_URL_LENGTH || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  // A bare word ("https://photos") is not a site anyone else can open.
  if (!url.hostname.includes(".") && !url.hostname.startsWith("[")) return null;
  url.hash = "";
  return url.toString();
}

/** "www.pinterest.com" → "pinterest.com": the short name shown on the card. */
export function siteOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export type LinkPreview = {
  title: string | null;
  description: string | null;
  image: string | null;
  site: string | null;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Turns "&amp;", "&#39;" and "&#x2014;" back into characters. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const value = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const clean = (value: string | undefined, max: number) => {
  const text = value ? decodeEntities(value).replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, max) : null;
};

/** The attributes of one tag, names lower-cased: `<meta property="og:title" content="…">`. */
function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const name = (match[1] as string).toLowerCase();
    result[name] = match[3] ?? match[4] ?? match[5] ?? "";
  }
  return result;
}

/**
 * Title, description, picture and site name from the page's Open Graph and Twitter tags,
 * falling back to <title>. Only the <head> is read; a relative picture address becomes
 * absolute. Anything missing is null.
 */
export function parseLinkPreview(html: string, pageUrl: string): LinkPreview {
  const head = html.slice(0, html.search(/<\/head>/i) >= 0 ? html.search(/<\/head>/i) : 200_000);
  const meta = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (key && attrs.content !== undefined && !meta.has(key)) meta.set(key, attrs.content);
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];

  const rawImage = meta.get("og:image:secure_url") ?? meta.get("og:image") ?? meta.get("twitter:image");
  let image: string | null = null;
  if (rawImage) {
    try {
      const absolute = new URL(decodeEntities(rawImage).trim(), pageUrl);
      if (absolute.protocol === "https:" || absolute.protocol === "http:") image = absolute.toString();
    } catch {
      image = null;
    }
  }

  return {
    title: clean(meta.get("og:title") ?? meta.get("twitter:title") ?? titleTag, 200),
    description: clean(meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description"), 300),
    image,
    site: clean(meta.get("og:site_name"), 100),
  };
}

export const MAX_PREVIEW_IMAGE_BYTES = 5 * 1024 * 1024;

export type PreviewImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/**
 * The picture's real type from its first bytes, or null. What the server says
 * (Content-Type) is not trusted: an "image" that is really HTML or SVG is refused.
 */
export function imageTypeOf(bytes: Uint8Array): PreviewImageType | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  if (text(0, 6) === "GIF87a" || text(0, 6) === "GIF89a") return "image/gif";
  return null;
}
