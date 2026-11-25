import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";

import { isPublicAddress } from "@/lib/net/public-address";

import { assertFetchable, UnsafeUrlError } from "./fetch-rules";

export { UnsafeUrlError };

/**
 * GET of an address a photographer pasted, safe against SSRF: our server must never be
 * talked into calling itself, the cloud metadata service or a private network.
 *
 * - only http and https, on the standard ports 80 and 443;
 * - every IP the name resolves to must be public, and it is checked at the moment of
 *   connecting (a custom `lookup`), so a name cannot resolve to a public address for the
 *   check and to a private one for the request (DNS rebinding);
 * - redirects are followed by hand, at most 3, each new address checked the same way;
 * - a time limit for the whole request and a size limit for the answer.
 */

export class FetchFailedError extends Error {}

export type SafeFetchOptions = {
  /** Sent as Accept. */
  accept: string;
  /** Whether a Content-Type is what we asked for ("text/html; charset=utf-8"). */
  acceptType: (contentType: string) => boolean;
  maxBytes: number;
  timeoutMs: number;
};

export type SafeFetchResult = { url: string; contentType: string; body: Buffer };

const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; ShootFlowBot/1.0; link preview)";

const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, "", 4);
    if (addresses.length === 0 || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(new UnsafeUrlError(`${hostname} is not a public address`), "", 4);
    }
    if (options.all) return callback(null, addresses);
    const first = addresses[0] as LookupAddress;
    return callback(null, first.address, first.family);
  });
};

type Answer = { status: number; location?: string; contentType: string; body?: Buffer };

function requestOnce(url: URL, options: SafeFetchOptions, signal: AbortSignal): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: { "User-Agent": USER_AGENT, Accept: options.accept, "Accept-Language": "en, ru;q=0.8" },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ status, location: response.headers.location, contentType });
          return;
        }
        if (status !== 200 || !options.acceptType(contentType)) {
          response.resume();
          reject(new FetchFailedError(`HTTP ${status} ${contentType}`));
          return;
        }
        const declared = Number(response.headers["content-length"] ?? 0);
        if (declared > options.maxBytes) {
          response.destroy();
          reject(new FetchFailedError("too large"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > options.maxBytes) {
            response.destroy();
            reject(new FetchFailedError("too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
        response.on("error", reject);
      },
    );
    request.on("error", (error) =>
      reject(error instanceof UnsafeUrlError ? error : new FetchFailedError(error.message)),
    );
    request.end();
  });
}

export async function safeFetch(input: string, options: SafeFetchOptions): Promise<SafeFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    let url = new URL(input);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      assertFetchable(url);
      const answer = await requestOnce(url, options, controller.signal);
      if (answer.body) return { url: url.toString(), contentType: answer.contentType, body: answer.body };
      if (!answer.location) throw new FetchFailedError("redirect without location");
      url = new URL(answer.location, url);
    }
    throw new FetchFailedError("too many redirects");
  } catch (error) {
    if (error instanceof UnsafeUrlError || error instanceof FetchFailedError) throw error;
    throw new FetchFailedError(error instanceof Error ? error.message : "failed");
  } finally {
    clearTimeout(timer);
  }
}
