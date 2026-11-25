import { PermanentError } from "./upload-queue";

/**
 * The browser side of an upload, shared by the Files uploader and the board: send bytes
 * to a signed R2 URL, and talk JSON to our upload routes.
 */

/**
 * PUTs bytes to a signed R2 URL and reports progress. XMLHttpRequest is used instead of
 * fetch because only it tells how many bytes have been sent so far.
 */
export function putBlob(url: string, blob: Blob, type: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Must match the type the URL was signed for.
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      // 4xx will not change on a retry (e.g. an expired or wrong signature); 5xx might.
      else if (xhr.status >= 400 && xhr.status < 500) reject(new PermanentError(`PUT ${xhr.status}`));
      else reject(new Error(`PUT ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(blob);
  });
}

/** POSTs JSON; a 4xx answer is permanent (retrying will not help), a 5xx may pass. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = response.status >= 500 ? Error : PermanentError;
    throw new error(`${url} ${response.status}`);
  }
  return (await response.json()) as T;
}
