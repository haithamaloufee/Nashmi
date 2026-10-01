import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

for (const role of ["admin", "super_admin"]) test(`baseline ${role}: populated report review controls and failed actions`, async ({ page, context }) => {
  await authenticate(context, role);
  await page.route("**/api/admin/reports/**", route => route.fulfill({ status: 503, json: { ok: false, error: { message: "QA moderation unavailable" } } }));
  await page.goto("/admin/reports");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  const form = page.locator("main form").first();
  await expect(form).toBeVisible();
  for (const action of ["dismiss_report", "hide", "delete", "restore"]) {
    await form.locator('select[name="action"]').selectOption(action);
    await form.locator('input[name="reason"]').fill("سبب اصطناعي لاختبار مسار الفشل");
    const response = page.waitForResponse(r => r.url().includes("/api/admin/reports/") && r.request().method() === "PATCH");
    await form.getByRole("button", { name: "تنفيذ", exact: true }).click();
    const result = await response;
    expect(result.request().postDataJSON().action).toBe(action);
    expect(result.status()).toBe(503);
    await expect(form.getByText("QA moderation unavailable", { exact: true })).toBeVisible();
  }
  for (const label of ["المفتوحة", "المرفوضة", "تم الإجراء", "الكل"]) {
    await page.locator("main").getByRole("link", { name: label, exact: true }).click();
    await expect(page.locator("main h1").last()).toContainText("البلاغات");
  }
});
