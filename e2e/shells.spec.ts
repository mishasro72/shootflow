import { expect, test } from "@playwright/test";

import en from "../messages/en.json";
import ru from "../messages/ru.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

// Every placeholder screen in both languages and both themes. The Playwright projects
// add the two widths: desktop 1440 px and mobile 375 px (see playwright.config.ts).
const LOCALES = [
  { browserLocale: "ru-RU", lang: "ru", t: ru },
  { browserLocale: "en-US", lang: "en", t: en },
] as const;
const THEMES = ["light", "dark"] as const;

const PUBLIC_PAGES = ["/", "/login", "/signup", "/p/example-token"];
const DASHBOARD_PAGES = ["/dashboard", "/dashboard/projects/new", "/dashboard/settings"];

for (const { browserLocale, lang, t } of LOCALES) {
  for (const theme of THEMES) {
    test.describe(`${lang}, ${theme} theme`, () => {
      // With no saved choice the app follows the system theme, which colorScheme sets.
      test.use({ locale: browserLocale, colorScheme: theme });

      test("public pages fit the screen", async ({ page }) => {
        for (const path of PUBLIC_PAGES) {
          await page.goto(path);
          await expect(page.locator("html")).toHaveAttribute("lang", lang);
          if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
          else await expect(page.locator("html")).not.toHaveClass(/dark/);
          await expectNoHorizontalScroll(page);
        }
      });

      test("dashboard pages fit the screen and show the right navigation", async ({ page }, testInfo) => {
        await signUpFresh(page, lang);
        const isDesktop = testInfo.project.name === "desktop";

        for (const path of DASHBOARD_PAGES) {
          await page.goto(path);
          await expectNoHorizontalScroll(page);

          // Two menus exist in the page (sidebar and tab bar); exactly one is visible.
          const nav = page.getByRole("navigation", { name: t.Nav.main });
          await expect(nav).toHaveCount(1);
          await expect(nav).toBeVisible();

          const box = await nav.boundingBox();
          const viewport = page.viewportSize();
          expect(box && viewport).toBeTruthy();
          if (box && viewport) {
            if (isDesktop) expect(box.x, "sidebar sits on the left").toBeLessThan(viewport.width / 2);
            else expect(box.y + box.height, "tab bar sits at the bottom").toBeGreaterThan(viewport.height - 4);
          }

          const current = path.startsWith("/dashboard/settings") ? t.Nav.settings : t.Nav.projects;
          await expect(nav.getByRole("link", { name: current })).toHaveAttribute("aria-current", "page");
        }
      });
    });
  }
}

test.describe("navigation", () => {
  test.use({ locale: "en-US" });

  test("menu links move between sections", async ({ page }) => {
    await signUpFresh(page);
    const nav = page.getByRole("navigation", { name: en.Nav.main });

    await nav.getByRole("link", { name: en.Nav.settings }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.Settings.title);

    await nav.getByRole("link", { name: en.Nav.projects }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.Dashboard.title);
  });

  test("theme and language can be changed from settings on any screen size", async ({ page }) => {
    await signUpFresh(page);
    await page.goto("/dashboard/settings");

    await page.getByRole("main").getByRole("button", { name: en.Common.themeDark }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("main").getByRole("button", { name: "RU" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ru.Settings.title);
  });

  test("the client portal is hidden from search engines", async ({ page }) => {
    await page.goto("/p/example-token");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    await expect(page.getByTestId("portal-placeholder")).toBeVisible();
  });
});
