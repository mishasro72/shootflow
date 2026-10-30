import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const f = en.ProjectForm;

async function fillProject(page: Page, values: { title: string; endTime?: string }) {
  await page.getByLabel(f.title).fill(values.title);
  await page.getByLabel(f.shootDate).fill("2026-11-14");
  await page.getByLabel(f.startTime).fill("17:00");
  await page.getByLabel(f.endTime).fill(values.endTime ?? "19:00");
  await page.getByLabel(f.timezone).selectOption("America/New_York");
  await page.getByLabel(f.locationName).fill("Dix Park");
  await page.getByLabel(f.clientName).fill("Anna");
  await page.getByLabel(f.clientEmail).fill("anna@example.com");
}

test("create, view, edit and archive a project", async ({ page }) => {
  await signUpFresh(page);

  // Empty dashboard → new project form.
  await page.getByRole("link", { name: en.Dashboard.createFirst }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/new$/);
  await expectNoHorizontalScroll(page);

  await fillProject(page, { title: "Golden hour portraits" });
  await page.getByRole("button", { name: f.create }).click();

  // Project page, with the time shown in the project's time zone.
  await expect(page).toHaveURL(/\/dashboard\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Golden hour portraits");
  await expect(page.getByTestId("project-status")).toHaveText(en.ProjectStatus.DRAFT);
  const when = page.getByTestId("project-when");
  await expect(when).toContainText("Saturday, November 14, 2026");
  await expect(when).toContainText("5:00");
  await expect(when).toContainText("7:00");
  await expect(page.getByText("anna@example.com")).toBeVisible();
  await expect(page.getByTestId("client-link")).toContainText("/p/");
  await expectNoHorizontalScroll(page);

  // Edit: the form opens with the saved values, including the local time.
  await page.getByRole("link", { name: en.Project.edit }).click();
  await expect(page.getByLabel(f.startTime)).toHaveValue("17:00");
  await expect(page.getByLabel(f.timezone)).toHaveValue("America/New_York");
  await page.getByLabel(f.title).fill("Golden hour portraits, take two");
  await page.getByRole("button", { name: f.save }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Golden hour portraits, take two");

  // The dashboard lists it and links to it.
  await page.getByRole("navigation", { name: en.Nav.main }).getByRole("link", { name: en.Nav.projects }).click();
  await expect(page.getByTestId("projects-list")).toContainText("Golden hour portraits, take two");
  await page.getByRole("link", { name: /Golden hour portraits, take two/ }).click();

  // Archive takes two clicks and removes it from the list.
  await page.getByRole("button", { name: en.Project.archive }).click();
  await page.getByRole("button", { name: en.Project.archiveYes }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("projects-empty")).toBeVisible();
});

test("validation errors keep what was typed", async ({ page }) => {
  await signUpFresh(page);
  await page.goto("/dashboard/projects/new");

  await fillProject(page, { title: "Studio session", endTime: "16:00" });
  await page.getByRole("button", { name: f.create }).click();

  await expect(page.getByTestId("error-endTime")).toHaveText(f.errors.endBeforeStart);
  await expect(page.getByLabel(f.title)).toHaveValue("Studio session");
  await expect(page.getByLabel(f.clientEmail)).toHaveValue("anna@example.com");
  await expect(page).toHaveURL(/\/dashboard\/projects\/new$/);

  await page.getByLabel(f.endTime).fill("18:00");
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio session");
});

test("another photographer cannot open the project", async ({ page, browser }) => {
  await signUpFresh(page);
  await page.goto("/dashboard/projects/new");
  await page.getByLabel(f.title).fill("Private shoot");
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Private shoot");
  const projectUrl = page.url();

  const other = await browser.newContext({ locale: "en-US" });
  const otherPage = await other.newPage();
  await signUpFresh(otherPage);
  const response = await otherPage.goto(projectUrl);
  expect(response?.status()).toBe(404);
  await expect(otherPage.getByText("Private shoot")).toHaveCount(0);

  const editResponse = await otherPage.goto(`${projectUrl}/edit`);
  expect(editResponse?.status()).toBe(404);
  await other.close();
});
