/**
 * Size of a picture scaled to fit a square of `max` pixels, keeping its proportions.
 * A smaller picture keeps its size: enlarging adds no detail, only bytes.
 */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The long side of a board photo and of its thumbnail, in pixels. */
export const BOARD_IMAGE_PX = 2048;
export const BOARD_THUMB_PX = 400;
/** JPEG quality of both copies (0..1). */
export const BOARD_JPEG_QUALITY = 0.85;
