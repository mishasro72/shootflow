import { describe, expect, it } from "vitest";

import { TRASH_DAYS, trashDaysLeft } from "./trash";

describe("trashDaysLeft", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("counts whole days down from 30", () => {
    expect(trashDaysLeft("2026-11-20T11:00:00Z", now)).toBe(TRASH_DAYS);
    expect(trashDaysLeft("2026-11-19T11:00:00Z", now)).toBe(29);
    expect(trashDaysLeft("2026-10-22T12:00:00Z", now)).toBe(1);
  });

  it("never goes below zero or above 30", () => {
    expect(trashDaysLeft("2026-10-01T00:00:00Z", now)).toBe(0);
    expect(trashDaysLeft("2026-12-01T00:00:00Z", now)).toBe(TRASH_DAYS);
  });
});
