import "server-only";

import { AwsClient } from "aws4fetch";

import { getEnv } from "@/lib/env";

/**
 * Cloudflare R2 through its S3-compatible API. The bucket is private: nobody can read or
 * write a file without a URL this server signed, and every signed URL expires.
 * aws4fetch signs requests the way S3 expects (AWS Signature V4) in a few kilobytes.
 */

/** R2 is not configured: uploads are switched off and the UI says so. */
export class StorageUnavailableError extends Error {}

/** How long a signed upload URL works. Long enough for a big file on a slow phone. */
export const UPLOAD_URL_SECONDS = 15 * 60;
/** How long a signed download or preview URL works (the rules say 10–60 minutes). */
export const DOWNLOAD_URL_SECONDS = 30 * 60;

type Storage = { client: AwsClient; bucketUrl: string };

export function isStorageConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);
}

function storage(): Storage {
  const env = getEnv();
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
    throw new StorageUnavailableError("R2 is not configured");
  }
  const endpoint = env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    client: new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: env.R2_REGION,
    }),
    // Path-style address: <endpoint>/<bucket>/<key>.
    bucketUrl: `${endpoint.replace(/\/$/, "")}/${env.R2_BUCKET}`,
  };
}

function objectUrl(bucketUrl: string, key: string): URL {
  // Keys are made of ids and slashes only, so each segment is safe as it is.
  return new URL(`${bucketUrl}/${key.split("/").map(encodeURIComponent).join("/")}`);
}

/**
 * A URL the browser can PUT one file to, directly into R2. The Content-Type is part of
 * the signature, so the browser must send exactly the type that was declared.
 */
export async function signUpload(key: string, contentType: string): Promise<string> {
  const { client, bucketUrl } = storage();
  const url = objectUrl(bucketUrl, key);
  url.searchParams.set("X-Amz-Expires", String(UPLOAD_URL_SECONDS));
  const signed = await client.sign(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true },
  });
  return signed.url;
}

/**
 * A URL to read one file. With `downloadName` the browser saves it under that name;
 * without it, an image can be shown in an <img>.
 */
export async function signDownload(key: string, downloadName?: string): Promise<string> {
  const { client, bucketUrl } = storage();
  const url = objectUrl(bucketUrl, key);
  url.searchParams.set("X-Amz-Expires", String(DOWNLOAD_URL_SECONDS));
  if (downloadName) {
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    );
  }
  const signed = await client.sign(url.toString(), { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

/** The stored size of an object in bytes, or null if there is no such object. */
export async function objectSize(key: string): Promise<number | null> {
  const { client, bucketUrl } = storage();
  const response = await client.fetch(objectUrl(bucketUrl, key).toString(), { method: "HEAD" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 HEAD failed with ${response.status}`);
  return Number(response.headers.get("content-length"));
}

/** Deletes an object. Deleting one that is already gone is not an error. */
export async function deleteObject(key: string): Promise<void> {
  const { client, bucketUrl } = storage();
  const response = await client.fetch(objectUrl(bucketUrl, key).toString(), { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(`R2 DELETE failed with ${response.status}`);
}