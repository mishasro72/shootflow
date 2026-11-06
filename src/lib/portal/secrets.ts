import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { z } from "zod";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Client link tokens: 32 random bytes as base64url, 43 characters, like the database default. */
export const portalTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** A fresh secret for a client link or the calendar feed. */
export function newSecretToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The client PIN: exactly four digits. */
export const pinSchema = z.string().regex(/^\d{4}$/);

const KEY_LENGTH = 32;

/**
 * Stores a PIN as "scrypt$<salt>$<hash>". scrypt is deliberately slow and the salt is
 * random per PIN, so a leaked hash cannot be looked up in a table of all 10 000 PINs.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** True when `pin` matches a hash made by hashPin. Compares in constant time. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(pin, Buffer.from(salt, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
