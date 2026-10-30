import { expect, type Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

export const DEMO_USER = { email: "demo@shootflow.test", password: "shootflow-demo" };

/** Signs in as the seeded demo photographer, using labels in the page's language. */
export async function signInAsDemo(page: Page, locale: "ru" | "en" = "en") {
  const t = locale === "ru" ? ru : en;
  await page.goto("/login");
  await page.getByLabel(t.Auth.email).fill(DEMO_USER.email);
  await page.getByLabel(t.Auth.password).fill(DEMO_USER.password);
  await page.getByRole("button", { name: t.Auth.signIn, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Registers a brand-new photographer and lands on the dashboard. Each test gets its own
 * account, so tests that change settings (like the language) cannot affect each other.
 * The profile language is taken from the page, so pass the browser's language.
 */
export async function signUpFresh(page: Page, locale: "ru" | "en" = "en", name = "E2E Studio") {
  const t = locale === "ru" ? ru : en;
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@shootflow.test`;
  await page.goto("/signup");
  await page.getByLabel(t.Auth.name).fill(name);
  await page.getByLabel(t.Auth.email).fill(email);
  await page.getByLabel(t.Auth.password).fill("correct-horse-battery");
  await page.getByRole("button", { name: t.Auth.createAccount }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

/** Fails if the page is wider than the viewport, i.e. it scrolls sideways. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}
