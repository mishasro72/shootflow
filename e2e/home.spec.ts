import { expect, test } from "@playwright/test";

import en from "../messages/en.json";
import ru from "../messages/ru.json";

test.describe("home page", () => {
  test("renders in English for an English browser", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.Home.title);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("renders in Russian for a Russian browser", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "Accept-Language": "ru-RU,ru;q=0.9" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.Home.title);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  });

  test("language switch persists across reloads", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US" });
    await page.goto("/");
    await page.getByRole("button", { name: "RU" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.Home.title);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.Home.title);
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
