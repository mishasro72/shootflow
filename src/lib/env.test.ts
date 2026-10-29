import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const supabase = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(supabase);
    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("requires the Supabase settings", () => {
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects an invalid app URL with a readable message", () => {
    expect(() => parseEnv({ ...supabase, NEXT_PUBLIC_APP_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });
});
