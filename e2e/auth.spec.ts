import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { waitForLink } from "./helpers/mailpit";

// These tests need the local Supabase from `supabase start` (seeded demo user included).
test.use({ locale: "en-US" });

const PASSWORD = "correct-horse-battery";

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@shootflow.test`;
}

async function signUp(page: Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel(en.Auth.name).fill(name);
  await page.getByLabel(en.Auth.email).fill(email);
  await page.getByLabel(en.Auth.password).fill(PASSWORD);
  await page.getByRole("button", { name: en.Auth.createAccount }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: en.Dashboard.signOut }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("signed-out visitors are sent to login and returned afterwards", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  await page.getByLabel(en.Auth.email).fill("demo@shootflow.test");
  await page.getByLabel(en.Auth.password).fill("shootflow-demo");
  await page.getByRole("button", { name: en.Auth.signIn, exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("projects-list")).toContainText("Golden hour portraits");
});

test("sign up, sign out and sign in again", async ({ page }) => {
  const email = uniqueEmail("signup");
  await signUp(page, "Lena Studio", email);

  await expect(page.getByTestId("workspace-name")).toHaveText("Lena Studio");
  await expect(page.getByTestId("projects-empty")).toBeVisible();

  await signOut(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(en.Auth.email).fill(email);
  await page.getByLabel(en.Auth.password).fill(PASSWORD);
  await page.getByRole("button", { name: en.Auth.signIn, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("workspace-name")).toHaveText("Lena Studio");
});

test("a second photographer sees an empty dashboard, not someone else's projects", async ({ page }) => {
  await signUp(page, "Second Photographer", uniqueEmail("second"));

  await expect(page.getByTestId("projects-empty")).toBeVisible();
  await expect(page.getByText("Golden hour portraits")).toHaveCount(0);
});

test("wrong password shows an error and stays signed out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(en.Auth.email).fill("demo@shootflow.test");
  await page.getByLabel(en.Auth.password).fill("not-the-password");
  await page.getByRole("button", { name: en.Auth.signIn, exact: true }).click();

  await expect(page.getByTestId("auth-error")).toHaveText(en.Auth.errors.invalidCredentials);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("signing up twice with the same email is refused", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel(en.Auth.name).fill("Duplicate");
  await page.getByLabel(en.Auth.email).fill("demo@shootflow.test");
  await page.getByLabel(en.Auth.password).fill(PASSWORD);
  await page.getByRole("button", { name: en.Auth.createAccount }).click();

  await expect(page.getByTestId("auth-error")).toHaveText(en.Auth.errors.userExists);
});

test("magic link signs in and creates a studio for a new address", async ({ page }) => {
  const email = uniqueEmail("magic");

  await page.goto("/login");
  await page.getByRole("tab", { name: en.Auth.methodMagicLink }).click();
  await page.getByLabel(en.Auth.email).fill(email);
  await page.getByRole("button", { name: en.Auth.sendMagicLink }).click();
  await expect(page.getByTestId("auth-sent")).toBeVisible();

  const link = await waitForLink(email);
  await page.goto(link);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("workspace-name")).toHaveText(email.split("@")[0] ?? "");
  await expect(page.getByTestId("projects-empty")).toBeVisible();
});

test("a link opened in another browser asks to sign in instead of failing", async ({ page, browser }) => {
  const email = uniqueEmail("otherbrowser");

  await page.goto("/login");
  await page.getByRole("tab", { name: en.Auth.methodMagicLink }).click();
  await page.getByLabel(en.Auth.email).fill(email);
  await page.getByRole("button", { name: en.Auth.sendMagicLink }).click();
  await expect(page.getByTestId("auth-sent")).toBeVisible();
  const link = await waitForLink(email);

  // A fresh context has none of the cookies from the browser that asked for the link.
  const other = await browser.newContext({ locale: "en-US" });
  const otherPage = await other.newPage();
  await otherPage.goto(link);
  await expect(otherPage).toHaveURL(/\/login\?notice=other-browser/);
  await expect(otherPage.getByTestId("auth-notice")).toHaveText(en.Auth.otherBrowser);
  await other.close();
});

test("signed-in photographers skip the login screen", async ({ page }) => {
  await signUp(page, "Skip Login", uniqueEmail("skip"));
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
});
