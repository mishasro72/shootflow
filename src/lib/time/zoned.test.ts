import { describe, expect, it } from "vitest";

import { isValidTimeZone, timeZoneOffsetMinutes, utcToZonedLocal, zonedLocalToUtc } from "./zoned";

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects anything else", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Asia/Yekaterinburg")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("timeZoneOffsetMinutes", () => {
  it("follows summer and winter time", () => {
    expect(timeZoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"), "America/New_York")).toBe(-300);
    expect(timeZoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"), "America/New_York")).toBe(-240);
    expect(timeZoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"), "Asia/Yekaterinburg")).toBe(300);
  });
});

describe("zonedLocalToUtc", () => {
  it("converts a winter evening in Raleigh", () => {
    expect(zonedLocalToUtc("2026-11-14", "17:00", "America/New_York").toISOString()).toBe(
      "2026-11-14T22:00:00.000Z",
    );
  });

  it("converts a summer evening in Raleigh", () => {
    expect(zonedLocalToUtc("2026-07-04", "19:30", "America/New_York").toISOString()).toBe(
      "2026-07-04T23:30:00.000Z",
    );
  });

  it("works east of Greenwich too", () => {
    expect(zonedLocalToUtc("2026-11-14", "10:00", "Asia/Yekaterinburg").toISOString()).toBe(
      "2026-11-14T05:00:00.000Z",
    );
  });

  it("handles the day clocks change", () => {
    // 1 Nov 2026: New York moves from UTC-4 to UTC-5 at 02:00.
    expect(zonedLocalToUtc("2026-11-01", "12:00", "America/New_York").toISOString()).toBe(
      "2026-11-01T17:00:00.000Z",
    );
  });
});

describe("utcToZonedLocal", () => {
  it("is the inverse of zonedLocalToUtc", () => {
    const moment = zonedLocalToUtc("2026-11-14", "17:00", "America/New_York");
    expect(utcToZonedLocal(moment.toISOString(), "America/New_York")).toEqual({
      date: "2026-11-14",
      time: "17:00",
    });
  });

  it("shows the same moment differently in another zone", () => {
    expect(utcToZonedLocal("2026-11-14T22:00:00Z", "Asia/Yekaterinburg")).toEqual({
      date: "2026-11-15",
      time: "03:00",
    });
  });
});
