import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const f = en.ProjectForm;
const p = en.Project;
const s = en.Settings;

/** Creates a dated project with a client and private notes; ends on its page. */
async function createShoot(page: Page, title: string) {
  await page.goto("/dashboard/projects/new");
  await page.getByLabel(f.title).fill(title);
  await page.getByLabel(f.shootDate).fill("2026-11-14");
  await page.getByLabel(f.startTime).fill("17:00");
  await page.getByLabel(f.endTime).fill("19:00");
  await page.getByLabel(f.timezone).selectOption("America/New_York");
  await page.getByLabel(f.locationName).fill("Dix Park");
  await page.getByLabel(f.clientName).fill("Anna");
  await page.getByLabel(f.notes).fill("Private: bring the 85mm");
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

/** The token at the end of the client link shown on the project page. */
async function clientToken(page: Page) {
  const link = (await page.getByTestId("client-link").textContent()) ?? "";
  return link.trim().split("/").pop() ?? "";
}

test("the photographer downloads the shoot with its local time and no private notes", async ({ page }) => {
  await signUpFresh(page);
  await createShoot(page, "Calendar shoot");

  const href = await page.getByRole("link", { name: p.addToCalendar }).getAttribute("href");
  expect(href).toMatch(/^\/api\/projects\/[0-9a-f-]{36}\/calendar\.ics$/);

  const response = await page.request.get(href ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(response.headers()["content-disposition"]).toContain("shoot-2026-11-14.ics");

  const ics = await response.text();
  expect(ics).toContain("DTSTART;TZID=America/New_York:20261114T170000");
  expect(ics).toContain("DTEND;TZID=America/New_York:20261114T190000");
  expect(ics).toContain("SUMMARY:Calendar shoot · Anna");
  expect(ics).toContain("LOCATION:Dix Park");
  expect(ics).not.toContain("85mm");
});

test("a signed-out visitor cannot download the photographer's file", async ({ page, request }) => {
  await signUpFresh(page);
  await createShoot(page, "Private calendar");
  const href = await page.getByRole("link", { name: p.addToCalendar }).getAttribute("href");

  // `request` has no cookies: it is somebody else.
  const response = await request.get(href ?? "");
  expect(response.status()).toBe(401);
});

test("the client's file follows the link, a new link and the PIN", async ({ page, request }) => {
  await signUpFresh(page);
  await createShoot(page, "Client calendar");
  await expectNoHorizontalScroll(page);

  // The client opens the file without signing in.
  const oldToken = await clientToken(page);
  const first = await request.get(`/api/p/${oldToken}/calendar.ics`);
  expect(first.status()).toBe(200);
  const ics = await first.text();
  expect(ics).toContain("SUMMARY:Client calendar · E2E Studio");
  expect(ics).toContain(`/p/${oldToken}`);
  expect(ics).not.toContain("85mm");

  // A new link: the old one stops working, the new one works.
  await page.getByTestId("rotate-link").click();
  await page.getByRole("button", { name: p.rotateYes }).click();
  await expect(page.getByTestId("client-link")).not.toContainText(oldToken);
  const newToken = await clientToken(page);
  expect((await request.get(`/api/p/${oldToken}/calendar.ics`)).status()).toBe(404);
  expect((await request.get(`/api/p/${newToken}/calendar.ics`)).status()).toBe(200);

  // A PIN: three digits are refused, four are saved, and the file then waits for the PIN.
  await page.getByLabel(p.pinLabel).fill("123");
  await page.getByRole("button", { name: p.pinSave }).click();
  await expect(page.getByText(p.pinInvalid)).toBeVisible();

  await page.getByLabel(p.pinLabel).fill("0420");
  await page.getByRole("button", { name: p.pinSave }).click();
  await expect(page.getByTestId("pin-state")).toHaveText(p.pinOn);
  expect((await request.get(`/api/p/${newToken}/calendar.ics`)).status()).toBe(403);

  // Removing the PIN opens the file again.
  await page.getByRole("button", { name: p.pinRemove }).click();
  await expect(page.getByTestId("pin-state")).toHaveText(p.pinOff);
  expect((await request.get(`/api/p/${newToken}/calendar.ics`)).status()).toBe(200);
});

test("the studio feed lists its shoots and can be replaced", async ({ page, request }) => {
  await signUpFresh(page);
  await createShoot(page, "Feed shoot");

  await page.goto("/dashboard/settings");
  const feedUrl = ((await page.getByTestId("calendar-feed").textContent()) ?? "").trim();
  expect(feedUrl).toMatch(/\/api\/calendar\/[A-Za-z0-9_-]{43}\/shoots\.ics$/);
  await expect(page.getByRole("link", { name: s.calendarSubscribe })).toHaveAttribute("href", /^webcal:\/\//);
  await expectNoHorizontalScroll(page);

  const feedPath = new URL(feedUrl).pathname;
  const feed = await request.get(feedPath);
  expect(feed.status()).toBe(200);
  const ics = await feed.text();
  expect(ics).toContain("SUMMARY:Feed shoot · Anna");
  expect(ics).toContain("X-WR-CALNAME:ShootFlow · E2E Studio");

  // A replaced link stops working at once.
  await page.getByTestId("rotate-feed").click();
  await page.getByRole("button", { name: s.calendarRotateYes }).click();
  await expect(page.getByTestId("calendar-feed")).not.toHaveText(feedUrl);
  expect((await request.get(feedPath)).status()).toBe(404);
});
