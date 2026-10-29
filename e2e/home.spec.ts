import { expect, test } from "@playwright/test";

import en from "../messages/en.json";
import ru from "../messages/ru.json";

const heading = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 1 });

test.describe("home page, English browser", () => {
  test.use({ locale: "en-US" });

  test("renders in English", async ({ page }) => {
    await page.goto("/");
    await expect(heading(page)).toHaveText(en.Home.title);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("language switch persists across reloads", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "RU" }).click();
    await expect(heading(page)).toHaveText(ru.Home.title);
    await page.reload();
    await expect(heading(page)).toHaveText(ru.Home.title);
  });

  test("dark theme can be selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: en.Common.themeDark }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("home page, Russian browser", () => {
  test.use({ locale: "ru-RU" });

  test("renders in Russian", async ({ page }) => {
    await page.goto("/");
    await expect(heading(page)).toHaveText(ru.Home.title);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
