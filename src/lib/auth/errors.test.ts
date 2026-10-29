import { describe, expect, it } from "vitest";

import { authErrorKey } from "./errors";

describe("authErrorKey", () => {
  it("maps known Supabase codes", () => {
    expect(authErrorKey({ code: "invalid_credentials" })).toBe("invalidCredentials");
    expect(authErrorKey({ code: "user_already_exists" })).toBe("userExists");
    expect(authErrorKey({ code: "email_exists" })).toBe("userExists");
    expect(authErrorKey({ code: "weak_password" })).toBe("weakPassword");
    expect(authErrorKey({ code: "otp_expired" })).toBe("linkInvalid");
  });

  it("treats HTTP 429 as rate limiting", () => {
    expect(authErrorKey({ status: 429 })).toBe("rateLimited");
  });

  it("hides unknown errors behind a generic message", () => {
    expect(authErrorKey({ code: "something_new" })).toBe("unexpected");
    expect(authErrorKey(null)).toBe("unexpected");
  });
});
