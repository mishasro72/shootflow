import { describe, expect, it } from "vitest";

import { placeLight } from "./place-light";

describe("placeLight", () => {
  // Raleigh, NC on 14 Nov 2026: the same reference day as light.test.ts.
  const light = placeLight("2026-11-14", 35.7796, -78.6382, "America/New_York", "en-US", "—");

  it("writes the day and the golden hours in the place's time zone", () => {
    expect(light.date).toBe("Saturday, November 14, 2026");
    expect(light.morningGolden).toMatch(/^6:3\d\s?–\s?7:2\d\sAM$/);
    expect(light.eveningGolden).toMatch(/^4:3\d\s?–\s?5:\d\d\sPM$/);
    expect(light.sunrise).toMatch(/^6:[45]\d\sAM$/);
    expect(light.sunset).toMatch(/^5:\d\d\sPM$/);
  });

  it("shows `none` for light the day does not have (polar night)", () => {
    const north = placeLight("2026-12-21", 78.22, 15.65, "Arctic/Longyearbyen", "en-US", "—");
    expect(north.sunrise).toBe("—");
    expect(north.morningGolden).toBe("—");
  });
});
