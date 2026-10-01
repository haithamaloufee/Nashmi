import { test, expect } from "@playwright/test";
import { authenticate, fixtures } from "./helpers";

test("owner controls refresh through login and logout without a full browser restart", async ({ page, context }) => {
  let meRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/auth/me")) meRequests++; });
  await page.goto("/updates");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  await expect(page.getByRole("button", { name: "إجراءات المحتوى", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "دخول", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.route("**/api/auth/login", async route => {
    // Synthetic success transport sets the real local QA session. No external account is used.
    await authenticate(context, "party");
    await route.fulfill({ json: { ok: true, data: {} } });
  });
  await page.locator('input[name="email"]').fill("party@nashmi.test");
  await page.locator('input[name="password"]').fill(fixtures().password);
  await page.locator("main form").getByRole("button", { name: "دخول", exact: true }).click();
  await expect(page).toHaveURL(/\/updates$/);
  await expect(page.getByRole("button", { name: "إجراءات المحتوى", exact: true }).first()).toBeVisible();
  await page.locator('button[aria-controls="account-menu"]').click();
  await page.getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
  await expect(page).toHaveURL(/:3020\/$/);
  await page.getByRole("link", { name: "الرئيسية", exact: true }).first().click();
  await expect(page).toHaveURL(/\/updates$/);
  await expect(page.getByRole("button", { name: "إجراءات المحتوى", exact: true })).toHaveCount(0);
  expect(meRequests, "auth reads are coalesced across cards").toBeLessThan(8);
});
