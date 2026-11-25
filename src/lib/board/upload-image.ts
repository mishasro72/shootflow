import { ImageDecodeError, prepareBoardImage, type PreparedImage } from "@/lib/images/prepare";
import { postJson, putBlob } from "@/lib/storage/upload-client";
import { withRetry } from "@/lib/storage/upload-queue";
import { BOARD_UPLOAD_TYPE, MAX_UPLOAD_BYTES, type SignedFile } from "@/lib/storage/upload-rules";

import { titleFromFileName } from "./schemas";

/**
 * Puts one photo into storage for the board, in the browser: make the 2048 px copy and
 * the 400 px thumbnail, reserve both in the studio's quota, PUT them straight to R2 and
 * confirm them. The caller then creates the card with `createImageCard`.
 */

export type BoardImageError = "tooLarge" | "decode" | "quota" | "failed";

export class BoardImageUploadError extends Error {
  constructor(readonly reason: BoardImageError) {
    super(reason);
  }
}

export type UploadedBoardImage = {
  imageId: string;
  thumbId: string;
  title: string;
  width: number;
  height: number;
  palette: string[];
};

export async function uploadBoardImage(projectId: string, file: File): Promise<UploadedBoardImage> {
  if (file.size > MAX_UPLOAD_BYTES) throw new BoardImageUploadError("tooLarge");

  let prepared: PreparedImage;
  try {
    prepared = await prepareBoardImage(file);
  } catch (error) {
    throw new BoardImageUploadError(error instanceof ImageDecodeError ? "decode" : "failed");
  }

  const title = titleFromFileName(file.name);
  const base = title || "photo";
  const copies = [
    { name: `${base}.jpg`, blob: prepared.full },
    { name: `${base}-thumb.jpg`, blob: prepared.thumb },
  ];

  let signed: SignedFile[];
  try {
    ({ files: signed } = await postJson<{ files: SignedFile[] }>("/api/uploads/sign", {
      projectId,
      purpose: "BOARD",
      files: copies.map(({ name, blob }) => ({ name, type: BOARD_UPLOAD_TYPE, size: blob.size })),
    }));
  } catch {
    throw new BoardImageUploadError("failed");
  }
  if (signed.some((answer) => "error" in answer && answer.error === "quota")) {
    throw new BoardImageUploadError("quota");
  }

  const ids: string[] = [];
  try {
    for (const [index, copy] of copies.entries()) {
      const answer = signed[index];
      if (!answer || !("url" in answer)) throw new Error("not signed");
      await withRetry(() => putBlob(answer.url, copy.blob, BOARD_UPLOAD_TYPE));
      await withRetry(() => postJson("/api/uploads/complete", { id: answer.id }));
      ids.push(answer.id);
    }
  } catch {
    // An unfinished reservation is dropped after a day; a finished copy without a card
    // is removed by the nightly clean-up of unused board files.
    throw new BoardImageUploadError("failed");
  }

  return {
    imageId: ids[0] as string,
    thumbId: ids[1] as string,
    title,
    width: prepared.width,
    height: prepared.height,
    palette: prepared.palette,
  };
}
