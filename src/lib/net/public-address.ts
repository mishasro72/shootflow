import { BlockList, isIP } from "node:net";

/**
 * Is this IP address somewhere on the public internet? Our server fetches pages that
 * photographers paste, so it must never be talked into calling itself, the cloud's
 * metadata service (169.254.169.254) or anything else on a private network (SSRF).
 * Ranges: IANA special-purpose registries for IPv4 and IPv6.
 */
const blocked = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b:1::", 48], // local NAT64
  ["100::", 64], // discard
  ["2001::", 23], // IETF protocol assignments
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4 (wraps an IPv4 address)
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

/** The IPv4 address hidden in "::ffff:10.0.0.1", "::ffff:a00:1" or "64:ff9b::a00:1", if any. */
function embeddedIpv4(address: string): string | null {
  const lower = address.toLowerCase();
  const prefix = ["::ffff:", "64:ff9b::"].find((p) => lower.startsWith(p));
  if (!prefix) return null;
  const rest = lower.slice(prefix.length);
  if (isIP(rest) === 4) return rest;
  const groups = rest.split(":");
  if (groups.length !== 2 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  const [high, low] = groups.map((g) => parseInt(g, 16)) as [number, number];
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family !== 6) return false;
  const v4 = embeddedIpv4(address);
  if (v4) return isPublicAddress(v4);
  return !blocked.check(address, "ipv6");
}
