import { timingSafeEqual } from "node:crypto";

/**
 * True when the request carries "Authorization: Bearer <secret>". Vercel Cron sends the
 * project's CRON_SECRET this way. Without a configured secret, nothing is authorized.
 * The comparison takes the same time for every wrong guess.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
