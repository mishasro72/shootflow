import { describe, expect, it } from "vitest";

import { utcToZonedLocal, zonedLocalToUtc } from "@/lib/time/zoned";

import { getDayLight, goldenHourAdvice, moveShoot } from "./light";

const RALEIGH = { lat: 35.7796, lng: -78.6382, tz: "America/New_York" };
const DAY = "2026-11-14";

/** Local "HH:MM" in Raleigh, or null. */
const local = (date: Date | null | undefined) => (date ? utcToZonedLocal(date.toISOString(), RALEIGH.tz).time : null);

/** Asserts a local time is within `tolerance` minutes of the expected "HH:MM". */
function expectNear(date: Date | null | undefined, expected: string, tolerance = 3) {
  const actual = local(date);
  if (!actual) throw new Error(`expected a time near ${expected}, got none`);
  const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  expect(Math.abs(minutes(actual) - minutes(expected)), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

const at = (time: string) => zonedLocalToUtc(DAY, time, RALEIGH.tz);

describe("getDayLight", () => {
  // Reference values from the NOAA solar equations for Raleigh, NC on 14 Nov 2026 (EST).
  const light = getDayLight(DAY, RALEIGH.lat, RALEIGH.lng, RALEIGH.tz);

  it("finds sunrise and sunset", () => {
    expectNear(light.sunrise, "06:50");
    expectNear(light.sunset, "17:08");
  });

  it("finds the morning blue and golden hours", () => {
    expectNear(light.morningBlue?.start, "06:23");
    expectNear(light.morningBlue?.end, "06:33");
    expectNear(light.morningGolden?.start, "06:33");
    expectNear(light.morningGolden?.end, "07:27");
  });

  it("finds the evening golden and blue hours", () => {
    expectNear(light.eveningGolden?.start, "16:31");
    expectNear(light.eveningGolden?.end, "17:25");
    expectNear(light.eveningBlue?.start, "17:25");
    expectNear(light.eveningBlue?.end, "17:36");
  });

  it("works on a summer day too (daylight saving time)", () => {
    const summer = getDayLight("2026-06-21", RALEIGH.lat, RALEIGH.lng, RALEIGH.tz);
    expect(local(summer.sunset)).toMatch(/^20:3\d$/);
  });

  it("returns nulls for what does not happen in a polar night", () => {
    const tromso = getDayLight("2026-12-21", 69.6492, 18.9553, "Europe/Oslo");
    expect(tromso.sunrise).toBeNull();
    expect(tromso.sunset).toBeNull();
    expect(tromso.morningGolden).toBeNull();
    expect(tromso.eveningGolden).toBeNull();
    // The sun still climbs above −6°, so there is twilight.
    expect(tromso.morningBlue).not.toBeNull();
  });
});

describe("goldenHourAdvice", () => {
  const light = getDayLight(DAY, RALEIGH.lat, RALEIGH.lng, RALEIGH.tz);

  it("is quiet when the shoot touches a golden hour", () => {
    expect(goldenHourAdvice(light, at("16:00"), at("17:30"))).toBeNull();
    expect(goldenHourAdvice(light, at("07:00"), null)).toBeNull();
  });

  it("suggests the evening golden hour for a midday shoot", () => {
    const advice = goldenHourAdvice(light, at("12:00"), at("13:00"));
    expect(advice?.window).toBe("evening");
    expectNear(advice?.range.start, "16:31");
  });

  it("suggests the morning golden hour for an early shoot", () => {
    const advice = goldenHourAdvice(light, at("08:30"), at("09:30"));
    expect(advice?.window).toBe("morning");
    expectNear(advice?.range.start, "06:33");
  });

  it("is quiet on a day without golden hours", () => {
    const tromso = getDayLight("2026-12-21", 69.6492, 18.9553, "Europe/Oslo");
    expect(goldenHourAdvice(tromso, new Date("2026-12-21T11:00:00Z"), null)).toBeNull();
  });
});

describe("moveShoot", () => {
  it("keeps the length of the shoot", () => {
    const moved = moveShoot(at("12:00"), at("13:30"), at("16:31"));
    expect(local(moved.start)).toBe("16:31");
    expect(local(moved.end)).toBe("18:01");
  });

  it("keeps a missing end missing", () => {
    expect(moveShoot(at("12:00"), null, at("16:31")).end).toBeNull();
  });
});