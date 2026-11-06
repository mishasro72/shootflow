import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const f = en.ProjectForm;
const p = en.Project;

const PLACE = {
  placeId: "ChIJ-e2e-dix-park",
  name: "Dorothea Dix Park",
  address: "2105 Umstead Dr, Raleigh, NC 27603, USA",
  lat: 35.7686,
  lng: -78.6564,
  timeZone: "America/New_York",
};

/**
 * The browser asks our /api/places routes, which would call Google. Tests answer those
 * requests themselves, so they need no key and cost nothing.
 */
async function mockPlaces(page: Page) {
  await page.route("**/api/places/autocomplete?*", (route) =>
    route.fulfill({
      json: { suggestions: [{ placeId: PLACE.placeId, mainText: PLACE.name, secondaryText: "Raleigh, NC, USA" }] },
    }),
  );
  await page.route("**/api/places/details?*", (route) => route.fulfill({ json: PLACE }));
}

test("a picked place fills the form and brings golden hour to the project", async ({ page }) => {
  await mockPlaces(page);
  await signUpFresh(page);
  await page.goto("/dashboard/projects/new");

  await page.getByLabel(f.title).fill("Dix Park at noon");
  await page.getByLabel(f.shootDate).fill("2026-11-14");
  await page.getByLabel(f.startTime).fill("12:00");
  await page.getByLabel(f.endTime).fill("13:00");
  // A different zone first, to see the place set the right one.
  await page.getByLabel(f.timezone).selectOption("UTC");

  await page.getByRole("combobox", { name: f.placeSearch }).fill("Dix Park");
  await page.getByRole("option", { name: new RegExp(PLACE.name) }).click();

  await expect(page.getByLabel(f.locationName)).toHaveValue(PLACE.name);
  await expect(page.getByLabel(f.locationAddress)).toHaveValue(PLACE.address);
  await expect(page.getByLabel(f.timezone)).toHaveValue("America/New_York");
  await expect(page.getByTestId("place-linked")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: f.create }).click();

  // The project page: a map link and the light for 14 November in Raleigh.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dix Park at noon");
  await expect(page.getByRole("link", { name: p.openMap })).toHaveAttribute("href", /query_place_id=ChIJ-e2e-dix-park/);
  const light = page.getByTestId("project-light");
  await expect(light).toContainText(p.lightSunset);
  await expect(light).toContainText(p.lightEveningGolden);
  await expectNoHorizontalScroll(page);

  // Noon misses golden hour: one click moves the shoot into the evening one (≈ 4:31 PM),
  // keeping its hour-long length.
  const advice = page.getByTestId("light-advice");
  await expect(advice).toBeVisible();
  await advice.getByRole("button", { name: /^Start at/ }).click();
  await expect(advice).toHaveCount(0);
  await expect(page.getByTestId("project-when")).toContainText(/4:[23]\d/);
  await expect(page.getByTestId("project-when")).toContainText(/5:[23]\d/);

  // Saving the form again keeps the place and its coordinates.
  await page.getByRole("link", { name: p.edit }).click();
  await expect(page.getByTestId("place-linked")).toBeVisible();
  await page.getByRole("button", { name: f.save }).click();
  await expect(page.getByTestId("project-light")).toBeVisible();

  // Unlinking removes the map link and the light.
  await page.getByRole("link", { name: p.edit }).click();
  await page.getByRole("button", { name: f.placeUnlink }).click();
  await page.getByRole("button", { name: f.save }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dix Park at noon");
  await expect(page.getByTestId("project-light")).toHaveCount(0);
  await expect(page.getByRole("link", { name: p.openMap })).toHaveCount(0);
  // The typed name stays: it is the photographer's text, not Google's.
  await expect(page.getByText(PLACE.name)).toBeVisible();
});

test("the search says so when nothing is found, and the fields still work by hand", async ({ page }) => {
  await page.route("**/api/places/autocomplete?*", (route) => route.fulfill({ json: { suggestions: [] } }));
  await signUpFresh(page);
  await page.goto("/dashboard/projects/new");

  await page.getByRole("combobox", { name: f.placeSearch }).fill("Nowhere at all");
  await expect(page.getByText(f.placeNoResults)).toBeVisible();

  await page.getByLabel(f.title).fill("Studio session");
  await page.getByLabel(f.locationName).fill("My studio");
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio session");
  await expect(page.getByText("My studio")).toBeVisible();
  await expect(page.getByRole("link", { name: p.openMap })).toHaveCount(0);
});
