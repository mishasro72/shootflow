import { describe, expect, it } from "vitest";

import { googleMapsUrl, isCoordsFresh, PLACE_ID_PATTERN } from "./policy";

describe("isCoordsFresh", () => {
  const now = new Date("2026-11-30T12:00:00Z");

  it("accepts coordinates synced less than 30 days ago", () => {
    expect(isCoordsFresh("2026-11-01T12:00:01Z", now)).toBe(true);
  });

  it("rejects old, missing or future dates", () => {
    expect(isCoordsFresh("2026-10-31T12:00:00Z", now)).toBe(false);
    expect(isCoordsFresh(null, now)).toBe(false);
    expect(isCoordsFresh("2026-12-30T12:00:00Z", now)).toBe(false);
  });
});

describe("googleMapsUrl", () => {
  it("links by place ID with the name as a label", () => {
    const url = new URL(googleMapsUrl("Dix Park & Café", "ChIJabc_123-x"));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe("Dix Park & Café");
    expect(url.searchParams.get("query_place_id")).toBe("ChIJabc_123-x");
  });

  it("falls back to the place ID when there is no name", () => {
    expect(new URL(googleMapsUrl("  ", "ChIJabc")).searchParams.get("query")).toBe("ChIJabc");
  });
});

describe("PLACE_ID_PATTERN", () => {
  it("accepts place IDs and rejects anything that could break a URL", () => {
    expect(PLACE_ID_PATTERN.test("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(true);
    expect(PLACE_ID_PATTERN.test("../etc")).toBe(false);
    expect(PLACE_ID_PATTERN.test("")).toBe(false);
  });
});
