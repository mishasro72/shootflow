import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "./nav-items";

const activeFor = (pathname: string) =>
  NAV_ITEMS.filter((item) => item.match(pathname)).map((item) => item.labelKey);

describe("NAV_ITEMS", () => {
  it("highlights exactly one item per page", () => {
    expect(activeFor("/dashboard")).toEqual(["projects"]);
    expect(activeFor("/dashboard/projects/abc/shoot")).toEqual(["projects"]);
    expect(activeFor("/dashboard/settings")).toEqual(["settings"]);
  });

  it("highlights nothing outside the dashboard", () => {
    expect(activeFor("/p/token")).toEqual([]);
  });
});
