import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

for (const role of ["citizen", "party", "iec", "admin", "super_admin"]) test(`baseline ${role}: saved chat sessions, native delete confirmation and account menu logout`, async ({ page, context }) => {
  await authenticate(context, role);
  await page.goto("/chat");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  const created = page.waitForResponse(r => r.url().endsWith("/api/chat/sessions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "محادثة جديدة", exact: true }).click();
  expect((await created).status()).toBe(201);
  const remove = page.getByRole("button", { name: "حذف المحادثة", exact: true }).first();
  await expect(remove).toBeVisible();
  page.once("dialog", dialog => dialog.dismiss());
  await remove.click();
  await expect(remove).toBeVisible();
  const deleted = page.waitForResponse(r => r.url().includes("/api/chat/sessions/") && r.request().method() === "DELETE");
  page.once("dialog", dialog => dialog.accept());
  await remove.click();
  expect((await deleted).ok()).toBe(true);
  await expect(remove).toHaveCount(0);
  const trigger = page.locator('button[aria-controls="account-menu"]');
  await trigger.click();
  await expect(page.locator("#account-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  for (const label of ["حسابي", "لوحة التحكم", "الإعدادات"]) {
    await trigger.click();
    await page.locator("#account-menu").getByRole("link", { name: label, exact: true }).click();
    await expect(page.locator("main").first()).toBeVisible();
  }
  await trigger.click();
  const logout = page.waitForResponse(r => r.url().endsWith("/api/auth/logout") && r.request().method() === "POST");
  await page.locator("#account-menu").getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
  expect((await logout).ok()).toBe(true);
  await expect(page.locator('button[aria-controls="account-menu"]')).toHaveCount(0);
});
