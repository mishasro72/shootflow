import { BOARD_IMAGE_PX, BOARD_JPEG_QUALITY, BOARD_THUMB_PX, fitWithin } from "./fit";
import { isHeicFile } from "./heic";
import { extractPalette } from "./palette";

/**
 * Turns a photo the photographer chose into what the board stores: a JPEG with the long
 * side at most 2048 px, a 400 px thumbnail and the photo's main colours. Runs in the
 * browser (canvas), so the original never leaves the device and the server stays light.
 */

/** The browser could not open the file as a picture. */
export class ImageDecodeError extends Error {}

export type PreparedImage = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  palette: string[];
};

/** Opens the file as a bitmap; HEIC is converted first. Photos are turned upright (EXIF). */
async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    let source: Blob = file;
    if (await isHeicFile(file)) {
      // Loaded only when needed: the HEIC decoder is a few megabytes of WebAssembly.
      const { heicTo } = await import("heic-to");
      source = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
    }
    return await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    throw new ImageDecodeError("decode");
  }
}

/** Draws `source` into a new canvas of the given size, on white (JPEG has no transparency). */
function draw(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageDecodeError("canvas");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return { canvas, context };
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageDecodeError("encode"))),
      "image/jpeg",
      BOARD_JPEG_QUALITY,
    );
  });
}

export async function prepareBoardImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await decode(file);
  try {
    const size = fitWithin(bitmap.width, bitmap.height, BOARD_IMAGE_PX);
    if (size.width === 0) throw new ImageDecodeError("empty");
    const full = draw(bitmap, size.width, size.height);

    // The thumbnail is made from the 2048 px copy: smaller steps look sharper.
    const thumbSize = fitWithin(size.width, size.height, BOARD_THUMB_PX);
    const thumb = draw(full.canvas, thumbSize.width, thumbSize.height);
    const pixels = thumb.context.getImageData(0, 0, thumbSize.width, thumbSize.height).data;

    return {
      full: await toJpeg(full.canvas),
      thumb: await toJpeg(thumb.canvas),
      width: size.width,
      height: size.height,
      palette: extractPalette(pixels, 5),
    };
  } finally {
    bitmap.close();
  }
}
