import { expect, test } from "@playwright/test";

// CI sets CRON_SECRET for the app; Vercel Cron sends it the same way in production.
const SECRET = process.env.CRON_SECRET ?? "";

test("the storage cleanup job answers only to the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/storage-cleanup")).status()).toBe(401);
  expect(
    (await request.get("/api/cron/storage-cleanup", { headers: { authorization: "Bearer wrong-secret-0000" } })).status(),
  ).toBe(401);

  test.skip(!SECRET, "CRON_SECRET is not set for this run");
  const response = await request.get("/api/cron/storage-cleanup", { headers: { authorization: `Bearer ${SECRET}` } });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { deleted: number; failed: number };
  expect(body.failed).toBe(0);
  expect(body.deleted).toBeGreaterThanOrEqual(0);
});
