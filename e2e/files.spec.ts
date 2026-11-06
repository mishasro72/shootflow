import { expect, test, type Page } from "@playwright/test";

import en from "../messages/en.json";

import { expectNoHorizontalScroll, signUpFresh } from "./helpers/auth";

test.use({ locale: "en-US" });

const f = en.ProjectForm;
const files = en.Files;
const u = en.Uploader;

// A real 1×1 PNG and a tiny PDF: small, but valid files of the accepted types.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n");

async function createProject(page: Page, title: string) {
  await page.goto("/dashboard/projects/new");
  await page.getByLabel(f.title).fill(title);
  await page.getByRole("button", { name: f.create }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

async function storageUsed(page: Page) {
  await page.goto("/dashboard/settings");
  return Number(await page.getByTestId("storage-used").getAttribute("data-bytes"));
}

test("files go straight to storage, show up, download and delete; storage use follows", async ({
  page,
  request,
}) => {
  await signUpFresh(page);
  await createProject(page, "Files shoot");
  const projectUrl = page.url();

  await page.getByTestId("file-input").setInputFiles([
    { name: "look-1.png", mimeType: "image/png", buffer: PNG },
    { name: "brief.pdf", mimeType: "application/pdf", buffer: PDF },
  ]);

  const uploads = page.getByTestId("upload-item");
  await expect(uploads.filter({ hasText: "look-1.png" })).toContainText(u.status.done);
  await expect(uploads.filter({ hasText: "brief.pdf" })).toContainText(u.status.done);

  // After the refresh both files are listed, the image with a preview.
  const rows = page.getByTestId("file-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "look-1.png" }).locator("img")).toBeVisible();
  await expectNoHorizontalScroll(page);

  // The download link is a signed storage URL that works without our cookies.
  const href = await page.getByRole("link", { name: files.downloadFile.replace("{name}", "look-1.png") }).getAttribute("href");
  expect(href).toContain("X-Amz-Signature=");
  const download = await request.get(href ?? "");
  expect(download.status()).toBe(200);
  expect((await download.body()).equals(PNG)).toBe(true);

  // Settings count exactly the two files.
  expect(await storageUsed(page)).toBe(PNG.length + PDF.length);

  // Deleting one file removes it and gives its space back.
  await page.goto(projectUrl);
  const look = rows.filter({ hasText: "look-1.png" });
  await look.getByRole("button", { name: files.delete }).click();
  await look.getByRole("button", { name: files.deleteYes }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("brief.pdf");
  expect(await storageUsed(page)).toBe(PDF.length);

  // The deleted object is gone from storage too.
  expect((await request.get(href ?? "")).status()).toBe(404);
});

test("a file of a type we do not accept is refused before anything is sent", async ({ page }) => {
  await signUpFresh(page);
  await createProject(page, "Refused file");

  let signRequests = 0;
  page.on("request", (req) => {
    if (req.url().includes("/api/uploads/sign")) signRequests += 1;
  });

  await page.getByTestId("file-input").setInputFiles([
    { name: "setup.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") },
  ]);
  await expect(page.getByTestId("upload-item")).toContainText(u.errors.type);
  expect(signRequests).toBe(0);
  await expect(page.getByTestId("file-row")).toHaveCount(0);
});

test("another photographer cannot upload into someone else's project", async ({ page, browser }) => {
  await signUpFresh(page);
  await createProject(page, "Not yours");
  const projectId = page.url().split("/").pop();

  const other = await browser.newContext({ locale: "en-US" });
  const otherPage = await other.newPage();
  await signUpFresh(otherPage);
  const response = await otherPage.request.post("/api/uploads/sign", {
    data: { projectId, files: [{ name: "x.png", type: "image/png", size: PNG.length }] },
  });
  expect(response.status()).toBe(404);
  await other.close();
});
