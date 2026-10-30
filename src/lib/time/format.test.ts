import { describe, expect, it } from "vitest";

import { formatShootDate, formatShootTime, formatTimeZone } from "./format";

// Intl puts narrow no-break spaces in some formats; compare on plain spaces.
const plain = (text: string) => text.replace(/[   ]/g, " ");

describe("formatShootDate", () => {
  it("uses the project time zone, not the viewer's", () => {
    // 22:00 UTC on Nov 14 is still Nov 14 in Raleigh but already Nov 15 in Tyumen.
    expect(formatShootDate("2026-11-14T22:00:00Z", "America/New_York", "en-US")).toBe("Saturday, November 14, 2026");
    expect(formatShootDate("2026-11-14T22:00:00Z", "Asia/Yekaterinburg", "en-US")).toBe("Sunday, November 15, 2026");
  });
});

describe("formatShootTime", () => {
  it("formats a range in the project time zone", () => {
    expect(plain(formatShootTime("2026-11-14T22:00:00Z", "2026-11-15T00:00:00Z", "America/New_York", "en-US"))).toBe(
      "5:00 – 7:00 PM",
    );
  });

  it("uses 24-hour time in Russian", () => {
    expect(plain(formatShootTime("2026-11-14T22:00:00Z", null, "America/New_York", "ru"))).toBe("17:00");
  });
});

describe("formatTimeZone", () => {
  it("replaces underscores", () => {
    expect(formatTimeZone("America/New_York")).toBe("America/New York");
  });
});
