// @vitest-environment node
import { describe, expect, it } from "vitest";

import { hashPin, newSecretToken, pinSchema, portalTokenSchema, verifyPin } from "./secrets";

describe("newSecretToken", () => {
  it("makes URL-safe 43-character tokens that are never the same", () => {
    const a = newSecretToken();
    const b = newSecretToken();
    expect(portalTokenSchema.safeParse(a).success).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("pinSchema", () => {
  it("accepts exactly four digits", () => {
    expect(pinSchema.safeParse("0420").success).toBe(true);
    expect(pinSchema.safeParse("042").success).toBe(false);
    expect(pinSchema.safeParse("04200").success).toBe(false);
    expect(pinSchema.safeParse("04a0").success).toBe(false);
  });
});

describe("hashPin / verifyPin", () => {
  it("never stores the PIN itself and checks it back", async () => {
    const stored = await hashPin("0420");
    expect(stored).not.toContain("0420");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPin("0420", stored)).toBe(true);
    expect(await verifyPin("0421", stored)).toBe(false);
  });

  it("salts every hash, so the same PIN gives different hashes", async () => {
    expect(await hashPin("1234")).not.toBe(await hashPin("1234"));
  });

  it("rejects a malformed stored value", async () => {
    expect(await verifyPin("1234", "plain-1234")).toBe(false);
  });
});
