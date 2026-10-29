import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, localeFromAcceptLanguage, resolveLocale } from "./config";

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("localeFromAcceptLanguage", () => {
  it("picks the highest-ranked supported language", () => {
    expect(localeFromAcceptLanguage("ru-RU,ru;q=0.9,en-US;q=0.8")).toBe("ru");
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9,en;q=0.5,ru;q=0.4")).toBe("en");
    expect(localeFromAcceptLanguage("en;q=0.2,ru;q=0.8")).toBe("ru");
  });

  it("returns null when nothing matches", () => {
    expect(localeFromAcceptLanguage("de,fr")).toBeNull();
    expect(localeFromAcceptLanguage("")).toBeNull();
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });

  it("ignores languages with q=0", () => {
    expect(localeFromAcceptLanguage("ru;q=0,en;q=0.5")).toBe("en");
  });
});

describe("resolveLocale", () => {
  it("prefers the cookie over the browser language", () => {
    expect(resolveLocale("en", "ru-RU")).toBe("en");
  });

  it("falls back to the browser language, then the default", () => {
    expect(resolveLocale(undefined, "ru-RU")).toBe("ru");
    expect(resolveLocale("xx", "de-DE")).toBe(defaultLocale);
  });
});
