import { describe, expect, it } from "vitest";

import { fitWithin } from "./fit";

describe("fitWithin", () => {
  it("scales the long side down to the limit and keeps the proportions", () => {
    expect(fitWithin(6000, 4000, 2048)).toEqual({ width: 2048, height: 1365 });
    expect(fitWithin(4000, 6000, 400)).toEqual({ width: 267, height: 400 });
    expect(fitWithin(3000, 3000, 400)).toEqual({ width: 400, height: 400 });
  });

  it("never enlarges a small picture", () => {
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it("keeps at least one pixel on a very thin picture", () => {
    expect(fitWithin(10000, 2, 400)).toEqual({ width: 400, height: 1 });
  });

  it("answers zero for a picture with no size", () => {
    expect(fitWithin(0, 100, 400)).toEqual({ width: 0, height: 0 });
  });
});
