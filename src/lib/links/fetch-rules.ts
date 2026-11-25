import { isIP } from "node:net";

import { isPublicAddress } from "@/lib/net/public-address";

/** The address must not be fetched: wrong protocol or port, a login inside, a private host. */
export class UnsafeUrlError extends Error {}

/**
 * The checks that need no network: only http and https on ports 80 and 443, no login in
 * the address, no localhost, and an IP written in the address must be public (such an
 * address is not looked up, so the lookup check in safe-fetch.ts would not see it).
 */
export function assertFetchable(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("protocol");
  if (url.username || url.password) throw new UnsafeUrlError("credentials");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) throw new UnsafeUrlError("localhost");
  if (isIP(host) && !isPublicAddress(host)) throw new UnsafeUrlError("private address");
}
