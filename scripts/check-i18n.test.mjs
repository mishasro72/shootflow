// @vitest-environment node
import { describe, expect, it } from "vitest";

import { compareLocales, flattenKeys } from "./check-i18n.mjs";

describe("flattenKeys", () => {
  it("flattens nested keys and records empty values", () => {
    const empty = [];
    expect(flattenKeys({ A: { b: "x", c: " " }, d: "y" }, "", empty)).toEqual(["A.b", "A.c", "d"]);
    expect(empty).toEqual(["A.c"]);
  });
});

describe("compareLocales", () => {
  it("reports keys missing from one locale", () => {
    const problems = compareLocales({
      ru: { keys: ["A.b"], empty: [] },
      en: { keys: ["A.b", "A.c"], empty: [] },
    });
    expect(problems).toEqual(["ru: missing A.c"]);
  });

  it("passes when locales match", () => {
    expect(
      compareLocales({ ru: { keys: ["x"], empty: [] }, en: { keys: ["x"], empty: [] } }),
    ).toEqual([]);
  });
});

describe("real translation files", () => {
  it("are in sync", async () => {
    const ru = (await import("../messages/ru.json")).default;
    const en = (await import("../messages/en.json")).default;
    const ruEmpty = [];
    const enEmpty = [];
    const problems = compareLocales({
      ru: { keys: flattenKeys(ru, "", ruEmpty), empty: ruEmpty },
      en: { keys: flattenKeys(en, "", enEmpty), empty: enEmpty },
    });
    expect(problems).toEqual([]);
  });
});
