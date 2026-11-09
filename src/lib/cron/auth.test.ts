import { describe, expect, it } from "vitest";

import { isCronAuthorized } from "./auth";

const SECRET = "a-long-enough-secret";

describe("isCronAuthorized", () => {
  it("accepts the exact bearer secret", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("refuses a missing, wrong or differently shaped header", () => {
    expect(isCronAuthorized(null, SECRET)).toBe(false);
    expect(isCronAuthorized("Bearer wrong", SECRET)).toBe(false);
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false);
    expect(isCronAuthorized(`bearer ${SECRET}`, SECRET)).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    expect(isCronAuthorized("Bearer ", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
