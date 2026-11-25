/**
 * HEIC/HEIF (iPhone photos). Browsers are unreliable here: Safari opens them, Chrome on
 * Windows and Android does not, and many report an empty or wrong MIME type. So we look
 * at the first bytes of the file: an ISO media file starts with a box `....ftyp<brand>`.
 */

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/** True if these first bytes (12 are enough) are a HEIC/HEIF image. */
export function isHeicHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  return text(4, 8) === "ftyp" && HEIC_BRANDS.has(text(8, 12));
}

/** True if the file is HEIC/HEIF, judged by its bytes, not by its name or type. */
export async function isHeicFile(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return isHeicHeader(head);
}
