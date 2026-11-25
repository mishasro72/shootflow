import { describe, expect, it } from "vitest";

import {
  compassPoint,
  openingMinute,
  PERSON_HEIGHT_M,
  shadowBearing,
  shadowLength,
  sunTrack,
  TRACK_STEP_MINUTES,
} from "./track";

// Raleigh, NC on 14 Nov 2026 (EST): sunrise ≈ 6:50, solar noon ≈ 11:59, sunset ≈ 17:08.
const track = sunTrack("2026-11-14", 35.7796, -78.6382, "America/New_York");
const at = (hhmm: string) => {
  const minute = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  const sample = track.find((s) => s.minute === minute);
  if (!sample) throw new Error(`no sample at ${hhmm}`);
  return sample;
};

describe("sunTrack", () => {
  it("samples every 15 minutes while the sun is up", () => {
    expect(track[0].minute).toBeGreaterThanOrEqual(6 * 60 + 45);
    expect(track[0].minute).toBeLessThanOrEqual(7 * 60 + 15);
    expect(track.at(-1)!.minute).toBeGreaterThanOrEqual(16 * 60 + 45);
    expect(track.at(-1)!.minute).toBeLessThanOrEqual(17 * 60 + 15);
    expect(track[1].minute - track[0].minute).toBe(TRACK_STEP_MINUTES);
    expect(track.every((s) => s.altitude > 0)).toBe(true);
  });

  it("puts the sun in the south at noon and in the south-east in the morning", () => {
    // Reference values from the NOAA solar equations.
    expect(at("12:00").bearing).toBeGreaterThan(177);
    expect(at("12:00").bearing).toBeLessThan(184);
    expect(at("12:00").altitude).toBeGreaterThan(35);
    expect(at("12:00").altitude).toBeLessThan(37);
    expect(at("09:00").bearing).toBeGreaterThan(131);
    expect(at("09:00").bearing).toBeLessThan(138);
    expect(at("09:00").altitude).toBeGreaterThan(19.5);
    expect(at("09:00").altitude).toBeLessThan(23);
  });

  it("is empty on a polar night and covers the whole day on a polar day", () => {
    expect(sunTrack("2026-12-21", 78.22, 15.65, "Arctic/Longyearbyen")).toEqual([]);
    expect(sunTrack("2026-06-21", 78.22, 15.65, "Arctic/Longyearbyen")).toHaveLength((24 * 60) / TRACK_STEP_MINUTES);
  });
});

describe("shadows", () => {
  it("fall away from the sun", () => {
    expect(shadowBearing(180)).toBe(0);
    expect(shadowBearing(135)).toBe(315);
    expect(shadowBearing(300)).toBe(120);
  });

  it("name the nearest compass point", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(22.4)).toBe("N");
    expect(compassPoint(22.5)).toBe("NE");
    expect(compassPoint(134)).toBe("SE");
    expect(compassPoint(247)).toBe("SW");
    expect(compassPoint(350)).toBe("N");
    expect(compassPoint(-90)).toBe("W");
  });

  it("are as long as the object at 45° and longer when the sun is low", () => {
    expect(shadowLength(45, PERSON_HEIGHT_M)).toBeCloseTo(1.7, 5);
    expect(shadowLength(10, PERSON_HEIGHT_M)!).toBeGreaterThan(9);
    expect(shadowLength(0, PERSON_HEIGHT_M)).toBeNull();
    expect(shadowLength(-5, PERSON_HEIGHT_M)).toBeNull();
  });
});

describe("openingMinute", () => {
  it("opens on the sample nearest to the shoot start", () => {
    expect(openingMinute(track, 12 * 60)).toBe(12 * 60);
    expect(openingMinute(track, 12 * 60 + 7)).toBe(12 * 60);
    expect(openingMinute(track, 12 * 60 + 8)).toBe(12 * 60 + 15);
    expect(openingMinute(track, 3 * 60)).toBe(track[0].minute);
    expect(openingMinute(track, 22 * 60)).toBe(track.at(-1)!.minute);
  });

  it("opens on the highest sun when the shoot has no time, and on nothing at night", () => {
    expect(openingMinute(track, null)).toBe(12 * 60);
    expect(openingMinute([], 12 * 60)).toBeNull();
  });
});
