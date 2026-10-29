import { describe, expect, it } from "vitest";

import { isAuthScreen, isProtectedPath, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/dashboard/projects/1")).toBe("/dashboard/projects/1");
    expect(safeNextPath("/dashboard?tab=x")).toBe("/dashboard?tab=x");
  });

  it("rejects external and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back for empty or non-string values", () => {
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath(42, "/login")).toBe("/login");
  });
});

describe("route groups", () => {
  it("protects the dashboard and everything under it", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/projects/1/shoot")).toBe(true);
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/p/token")).toBe(false);
  });

  it("recognises the auth screens", () => {
    expect(isAuthScreen("/login")).toBe(true);
    expect(isAuthScreen("/signup")).toBe(true);
    expect(isAuthScreen("/auth/callback")).toBe(false);
  });
});
