import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const b = en.Board;
const f = en.ProjectForm;

const PLACE = {
  placeId: "ChIJ-e2e-dix-park",
  name: "Dorothea Dix Park",
  address: "2105 Umstead Dr, Raleigh, NC 27603, USA",
  lat: 35.7686,
  lng: -78.6564,
  timeZone: "America/New_York",
};

/** Our /api/places routes would call Google; the test answers them itself (as in location.spec.ts). */
async function mockPlaces(page: Page) {
  await page.route("**/api/places/autocomplete?*", (route) =>
    route.fulfill({
      json: { suggestions: [{ placeId: PLACE.placeId, mainText: PLACE.name, secondaryText: "Raleigh, NC, USA" }] },
    }),
  );
  await page.route("**/api/places/details?*", (route) => route.fulfill({ json: PLACE }));
}

async function openBoard(page: Page, title: string, shootDate?: string) {
  await page.goto("/dashboard/projects/new");
  await page.getByLabel(f.title).fill(title);
  if (shootDate) {
    await page.getByLabel(f.shootDate).fill(shootDate);
    await page.getByLabel(f.startTime).fill("12:00");
  }
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.getByRole("link", { name: en.Project.tabBoard }).click();
  await expect(page).toHaveURL(/\/board$/);
}

async function addCard(page: Page, kind: string) {
  await page.getByTestId("add-card").click();
  await page.getByRole("menuitem", { name: kind }).click();
  await expect(page.getByTestId("card-editor")).toBeVisible();
}

test("a link card keeps its address; private addresses are never fetched", async ({ page }) => {
  await signUpFresh(page);
  await openBoard(page, "Link board");

  // Not a web page: refused with a clear message, the editor stays open.
  await addCard(page, b.kinds.LINK);
  const editor = page.getByTestId("card-editor");
  await editor.getByLabel(b.linkUrl).fill("javascript:alert(1)");
  await editor.getByRole("button", { name: b.save }).click();
  await expect(page.getByText(b.errors.badLink)).toBeVisible();
  await expect(editor).toBeVisible();

  // Our own server is a private address: the card is saved, but nothing was fetched
  // (no title from the page, no picture), only the address and the site name.
  await editor.getByLabel(b.linkUrl).fill("http://127.0.0.1:3000/dashboard");
  await editor.getByRole("button", { name: b.save }).click();
  await expect(editor).toHaveCount(0);
  const card = page.getByRole("article", { name: "127.0.0.1" });
  const preview = card.getByTestId("link-preview");
  await expect(preview).toHaveAttribute("href", "http://127.0.0.1:3000/dashboard");
  await expect(preview).toContainText("127.0.0.1");
  await expect(preview.locator("img")).toHaveCount(0);
  await expectNoHorizontalScroll(page);

  // A new title keeps the address.
  await page.getByRole("button", { name: b.menu.replace("{title}", "127.0.0.1") }).click();
  await page.getByRole("menuitem", { name: b.edit }).click();
  await page.getByTestId("card-editor").getByLabel(b.titleLabel).fill("Moodboard on Pinterest");
  await page.getByTestId("card-editor").getByRole("button", { name: b.save }).click();
  // Reload only once the save is done: the editor closes when the server has answered.
  await expect(page.getByTestId("card-editor")).toHaveCount(0);
  await page.reload();
  const renamed = page.getByRole("article", { name: "Moodboard on Pinterest" });
  await expect(renamed.getByTestId("link-preview")).toHaveAttribute("href", "http://127.0.0.1:3000/dashboard");
});

test("a place card from Google search shows the map, the light and the shadows of the shoot day", async ({ page }) => {
  await mockPlaces(page);
  await signUpFresh(page);
  await openBoard(page, "Place board", "2026-11-14");

  await addCard(page, b.kinds.LOCATION);
  const editor = page.getByTestId("card-editor");
  await editor.getByRole("combobox", { name: f.placeSearch }).fill("Dix Park");
  await page.getByRole("option", { name: new RegExp(PLACE.name) }).click();
  await expect(editor.getByLabel(b.placeName)).toHaveValue(PLACE.name);
  await expect(editor.getByLabel(b.placeAddress)).toHaveValue(PLACE.address);
  await expect(editor.getByTestId("place-linked")).toBeVisible();
  await editor.getByRole("button", { name: b.save }).click();
  await expect(editor).toHaveCount(0);

  const card = page.getByRole("article", { name: PLACE.name });
  await expect(card.getByText(PLACE.address)).toBeVisible();
  await expect(card.getByRole("link", { name: b.placeOpenMap })).toHaveAttribute(
    "href",
    /query_place_id=ChIJ-e2e-dix-park/,
  );
  const light = card.getByTestId("place-light");
  await expect(light).toContainText("Saturday, November 14, 2026");
  await expect(light).toContainText(b.placeMorningGolden);
  await expect(light).toContainText(/AM/);

  // Shadows open on the shoot start (noon): the sun in the south, the shadow to the north.
  const shadow = card.getByTestId("place-shadow");
  await expect(shadow).toContainText("12:00 PM");
  await expect(shadow).toContainText(b.sunFrom.S);
  await expect(shadow).toContainText(b.shadowTo.N);
  await expect(shadow).toContainText(/ft/);
  // At 9 AM the sun is in the south-east and the shadow falls to the north-west.
  await shadow.getByRole("slider", { name: b.shadowTime }).fill(String(9 * 60));
  await expect(shadow).toContainText("9:00 AM");
  await expect(shadow).toContainText(b.sunFrom.SE);
  await expect(shadow).toContainText(b.shadowTo.NW);
  await expectNoHorizontalScroll(page);

  // A place typed by hand: a map search for its address, and no light (no coordinates).
  await addCard(page, b.kinds.LOCATION);
  const manual = page.getByTestId("card-editor");
  await manual.getByLabel(b.placeName).fill("Studio X");
  await manual.getByLabel(b.placeAddress).fill("123 Main St, Raleigh");
  await manual.getByRole("button", { name: b.save }).click();
  const studio = page.getByRole("article", { name: "Studio X" });
  await expect(studio.getByRole("link", { name: b.placeOpenMap })).toHaveAttribute("href", /query=123\+Main\+St/);
  await expect(studio.getByTestId("place-light")).toHaveCount(0);
  await expect(studio.getByTestId("place-shadow")).toHaveCount(0);

  // Everything survives a reload.
  await page.reload();
  await expect(page.getByRole("article", { name: PLACE.name }).getByTestId("place-light")).toBeVisible();
});
