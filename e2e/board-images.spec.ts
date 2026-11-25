import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const b = en.Board;
const files = en.Files;

async function createProject(page: Page, title: string) {
  await page.goto("/dashboard/projects/new");
  await page.getByLabel(en.ProjectForm.title).fill(title);
  await page.getByRole("button", { name: en.ProjectForm.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

/**
 * A 3000×1500 PNG drawn by the browser itself: 70 % warm red, 30 % dark blue. Bigger
 * than 2048 px, so the board has to shrink it, and with two clear colours for the palette.
 */
async function makePhoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 1500;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.fillStyle = "#c0392b";
    context.fillRect(0, 0, 2100, 1500);
    context.fillStyle = "#2c3e50";
    context.fillRect(2100, 0, 900, 1500);
    return canvas.toDataURL("image/png").split(",")[1] as string;
  });
  return Buffer.from(base64, "base64");
}

/** Natural size of the picture behind a link, loaded the way the browser shows it. */
async function pictureSize(page: Page, url: string) {
  return page.evaluate(
    (src) =>
      new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("not an image"));
        image.src = src;
      }),
    url,
  );
}

test("photos on the board are shrunk in the browser, give a palette and survive a reload", async ({ page }) => {
  await signUpFresh(page);
  await createProject(page, "Photo board");
  await page.getByRole("link", { name: en.Project.tabBoard }).click();
  await expect(page).toHaveURL(/\/board$/);

  const photo = await makePhoto(page);
  await page
    .getByTestId("board-image-input")
    .setInputFiles({ name: "window-light.png", mimeType: "image/png", buffer: photo });

  const card = page.getByRole("article", { name: "window-light" });
  const image = card.getByTestId("board-image");
  await expect(image).toBeVisible();
  await expect(card.getByTestId("review-status")).toHaveText(b.status.PENDING);
  await expect(page.getByTestId("image-progress")).toHaveCount(0);

  // Two signed copies: the 400 px thumbnail and the 2048 px one; the original is not kept.
  const srcset = (await image.getAttribute("srcset")) ?? "";
  expect(srcset).toMatch(/ 400w, .+ 2048w$/);
  const big = await card
    .getByRole("link", { name: b.openImage.replace("{title}", "window-light") })
    .getAttribute("href");
  expect(big).toContain("X-Amz-Signature=");
  expect(await pictureSize(page, big ?? "")).toEqual({ width: 2048, height: 1024 });
  expect(await pictureSize(page, (await image.getAttribute("src")) ?? "")).toEqual({ width: 400, height: 200 });
  await expectNoHorizontalScroll(page);

  // Palette from the photo: a new card right below it, the main colour first.
  await page.getByRole("button", { name: b.menu.replace("{title}", "window-light") }).click();
  await page.getByRole("menuitem", { name: b.paletteFromImage }).click();
  const palette = page.getByRole("article", { name: b.paletteTitle.replace("{title}", "window-light") });
  await expect(palette.getByTestId("palette").locator("li")).not.toHaveCount(0);
  // Smoothing at the edge between the two colours may move a channel by a step or two.
  const first = (await palette.getByTestId("palette").locator("li code").first().textContent()) ?? "";
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const expected = channels("#c0392b");
  channels(first).forEach((value, i) => expect(Math.abs(value - (expected[i] as number))).toBeLessThanOrEqual(4));

  await page.reload();
  await expect(page.getByRole("article").getByRole("heading", { level: 3 })).toHaveText([
    "window-light",
    b.paletteTitle.replace("{title}", "window-light"),
  ]);
  await expect(page.getByTestId("board-image")).toBeVisible();

  // A file that is not a picture is refused with a clear message, and no card appears.
  await page.getByTestId("board-image-input").setInputFiles({
    name: "fake.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("this is not a photo"),
  });
  await expect(page.getByText(b.errors.decode)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("an image from Files is copied to the board and stays in Files", async ({ page }) => {
  await signUpFresh(page);
  await createProject(page, "Files to board");

  const photo = await makePhoto(page);
  await page.getByTestId("file-input").setInputFiles({ name: "look.png", mimeType: "image/png", buffer: photo });
  const row = page.getByTestId("file-row").filter({ hasText: "look.png" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: files.toBoardFile.replace("{name}", "look.png") }).click();
  await expect(row.getByTestId("on-board-link")).toHaveText(files.onBoard);

  await row.getByTestId("on-board-link").click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("article", { name: "look" }).getByTestId("board-image")).toBeVisible();

  // The Files folder still has its own file, and remembers that it is on the board.
  await page.getByRole("link", { name: en.Project.tabOverview }).click();
  const again = page.getByTestId("file-row").filter({ hasText: "look.png" });
  await expect(again.getByTestId("on-board-link")).toHaveText(files.onBoard);

  // Once the card is in the trash, the file can go to the board again.
  await again.getByTestId("on-board-link").click();
  await page.getByRole("button", { name: b.menu.replace("{title}", "look") }).click();
  await page.getByRole("menuitem", { name: b.trash }).click();
  await expect(page.getByRole("article", { name: "look" })).toHaveCount(0);
  await page.getByRole("link", { name: en.Project.tabOverview }).click();
  await expect(
    page
      .getByTestId("file-row")
      .filter({ hasText: "look.png" })
      .getByRole("button", {
        name: files.toBoardFile.replace("{name}", "look.png"),
      }),
  ).toBeVisible();
});
