import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const f = en.ProjectForm;
const b = en.Board;

async function createProject(page: Page, title: string) {
  await page.goto("/dashboard/projects/new");
  await page.getByLabel(f.title).fill(title);
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

/** Adds a card from an "Add" menu, fills the editor and saves. */
async function addCard(page: Page, trigger: string, kind: string, title: string, body?: string) {
  await page.getByTestId(trigger).click();
  await page.getByRole("menuitem", { name: kind }).click();
  const editor = page.getByTestId("card-editor");
  await editor.getByLabel(b.titleLabel).fill(title);
  if (body) await editor.getByLabel(b.bodyLabel).fill(body);
  await editor.getByRole("button", { name: b.save }).click();
  await expect(editor).toHaveCount(0);
}

async function openMenu(page: Page, title: string) {
  await page.getByRole("button", { name: b.menu.replace("{title}", title) }).click();
}

const headings = (page: Page) => page.getByRole("article").getByRole("heading", { level: 3 });

test("a photographer builds the board in the feed; order, visibility and the trash survive a reload", async ({
  page,
}) => {
  await signUpFresh(page);
  await createProject(page, "Board shoot");

  await page.getByRole("link", { name: en.Project.tabBoard }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByText(b.empty)).toBeVisible();

  // A look with a note inside, a palette and a section.
  await addCard(page, "add-card", b.kinds.LOOK, "Black dress", "Gold jewelry");
  const look = page.getByRole("article", { name: "Black dress" });
  await expect(look.getByTestId("review-status")).toHaveText(b.status.PENDING);
  await look.getByTestId("add-inside").click();
  await page.getByRole("menuitem", { name: b.kinds.NOTE }).click();
  await page.getByTestId("card-editor").getByLabel(b.titleLabel).fill("Hair");
  await page.getByTestId("card-editor").getByRole("button", { name: b.save }).click();
  await expect(look.getByRole("article", { name: "Hair" })).toBeVisible();

  await addCard(page, "add-card", b.kinds.PALETTE, "Sunset");
  await expect(page.getByRole("article", { name: "Sunset" }).getByTestId("palette").locator("li")).toHaveCount(4);
  await addCard(page, "add-card", b.kinds.SECTION, "Poses");

  await expect(headings(page)).toHaveText(["Black dress", "Hair", "Sunset", "Poses"]);
  await expectNoHorizontalScroll(page);

  // Move the palette above the look, and hide the note from the client.
  await openMenu(page, "Sunset");
  await page.getByRole("menuitem", { name: b.moveUp }).click();
  await expect(headings(page)).toHaveText(["Sunset", "Black dress", "Hair", "Poses"]);

  await openMenu(page, "Hair");
  await page.getByRole("menuitemradio", { name: b.visibility.PRIVATE }).click();
  await expect(page.getByRole("article", { name: "Hair" }).getByTestId("visibility-badge")).toHaveText(
    b.visibility.PRIVATE,
  );

  // Everything is still there after a reload.
  await page.reload();
  await expect(headings(page)).toHaveText(["Sunset", "Black dress", "Hair", "Poses"]);
  await expect(page.getByRole("article", { name: "Hair" }).getByTestId("visibility-badge")).toBeVisible();

  // The look goes to the trash with its note and comes back with it.
  await openMenu(page, "Black dress");
  await page.getByRole("menuitem", { name: b.trash }).click();
  await expect(headings(page)).toHaveText(["Sunset", "Poses"]);

  await page.getByTestId("trash-link").click();
  const row = page.getByTestId("trash-row");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Black dress");
  await row.getByRole("button", { name: b.restore }).click();
  await expect(row).toHaveCount(0);

  await page.getByRole("link", { name: b.backToBoard }).click();
  await expect(headings(page)).toHaveText(["Sunset", "Poses", "Black dress", "Hair"]);
  await expectNoHorizontalScroll(page);
});

test("another photographer cannot open someone else's board", async ({ page, browser }) => {
  await signUpFresh(page);
  await createProject(page, "Private board");
  const boardUrl = `${page.url()}/board`;

  const other = await browser.newContext({ locale: "en-US" });
  const otherPage = await other.newPage();
  await signUpFresh(otherPage);
  const response = await otherPage.goto(boardUrl);
  expect(response?.status()).toBe(404);
  await other.close();
});
