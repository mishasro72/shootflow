import { describe, expect, it } from "vitest";

import { formatBytes } from "./bytes";

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(512, "en")).toMatch(/^512\s?byte$/);
    expect(formatBytes(1536, "en")).toMatch(/^1\.5\s?kB$/i);
    expect(formatBytes(10 * 1024 * 1024 * 1024, "en")).toMatch(/^10\s?GB$/);
  });

  it("follows the language", () => {
    // The exact abbreviation comes from the runtime's language data, so only the shape is checked.
    expect(formatBytes(1536, "ru")).toMatch(/^1,5\s?кБ$/i);
  });
});
