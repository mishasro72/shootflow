import { describe, expect, it } from "vitest";

import { placeIdSchema, sessionTokenSchema } from "./schemas";

describe("placeIdSchema", () => {
  it("accepts place IDs and rejects anything that could break a URL", () => {
    expect(placeIdSchema.safeParse("ChIJN1t_tDeuEmsRUsoyG83frY4").success).toBe(true);
    expect(placeIdSchema.safeParse("../etc").success).toBe(false);
    expect(placeIdSchema.safeParse("").success).toBe(false);
  });
});

describe("sessionTokenSchema", () => {
  it("accepts a UUID and rejects longer or unsafe text", () => {
    expect(sessionTokenSchema.safeParse("6f1c2a7d-3b8e-4f6a-9c5d-7e9b1a3c5e7f").success).toBe(true);
    expect(sessionTokenSchema.safeParse("x".repeat(37)).success).toBe(false);
    expect(sessionTokenSchema.safeParse("a b").success).toBe(false);
  });
});