import "server-only";

import {
  imageTypeOf,
  MAX_PREVIEW_IMAGE_BYTES,
  parseLinkPreview,
  type LinkPreview,
  type PreviewImageType,
} from "./preview";
import { safeFetch } from "./safe-fetch";

/** Pages are read up to 1 MB: the tags we need are in <head>, near the top. */
const MAX_PAGE_BYTES = 1024 * 1024;

/** The charset from "text/html; charset=windows-1251", if the runtime knows it. */
function decoderFor(contentType: string): TextDecoder {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  try {
    return new TextDecoder(charset ?? "utf-8");
  } catch {
    return new TextDecoder("utf-8");
  }
}

/**
 * Title, description, picture and site of a page, or null when the page cannot be read
 * (a private address, a login wall, a timeout, not HTML). Never throws: a link card is
 * saved either way, just without a preview.
 */
export async function fetchLinkPreview(url: string): Promise<{ url: string; preview: LinkPreview } | null> {
  try {
    const page = await safeFetch(url, {
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
      acceptType: (type) => type.startsWith("text/html") || type.startsWith("application/xhtml+xml"),
      maxBytes: MAX_PAGE_BYTES,
      timeoutMs: 6000,
    });
    const html = decoderFor(page.contentType).decode(page.body);
    return { url: page.url, preview: parseLinkPreview(html, page.url) };
  } catch {
    return null;
  }
}

/** The preview picture's bytes and real type, or null (too big, not a picture, unreachable). */
export async function fetchPreviewImage(url: string): Promise<{ bytes: Uint8Array; type: PreviewImageType } | null> {
  try {
    const image = await safeFetch(url, {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9",
      acceptType: (type) => type.startsWith("image/") || type.startsWith("application/octet-stream"),
      maxBytes: MAX_PREVIEW_IMAGE_BYTES,
      timeoutMs: 8000,
    });
    const bytes = new Uint8Array(image.body);
    const type = imageTypeOf(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}
