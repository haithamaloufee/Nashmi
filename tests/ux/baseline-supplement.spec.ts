import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

for (const role of ["iec", "admin", "super_admin"]) test(`baseline ${role}: public law create/edit dialogs and failed save`, async ({ page, context }) => {
  await authenticate(context, role);
  await page.route("**/api/admin/laws**", route => route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 503, json: { ok: false, error: { message: "QA law save unavailable" } } }));
  await page.goto("/laws");
  await page.getByRole("button", { name: "إضافة قانون", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "إغلاق نموذج القانون", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/laws/qa-law");
  await page.getByRole("button", { name: "تعديل القانون", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="title"]').fill("عنوان تجريبي داخل النافذة");
  await dialog.locator('[name="changeReason"]').fill("اختبار محلي فقط");
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText("QA law save unavailable", { exact: true })).toBeVisible();
  await expect(dialog.locator('[name="title"]')).toHaveValue("عنوان تجريبي داخل النافذة");
  await page.getByRole("button", { name: "إغلاق نموذج القانون", exact: true }).click();
});

test("baseline floating assistant, IEC accordions, party search and admin news refresh failure", async ({ page, context }) => {
  await page.route("**/api/chat", route => route.request().method() === "POST" ? route.fulfill({ json: { ok: true, data: { message: { role: "assistant", content: "جواب اصطناعي لاختبار الواجهة" } } } }) : route.continue());
  await page.goto("/iec");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  const accordions = page.locator('main button[aria-controls][aria-expanded]');
  for (let i = 0; i < await accordions.count(); i++) { const control = accordions.nth(i); const before = await control.getAttribute("aria-expanded"); await control.click(); await expect(control).toHaveAttribute("aria-expanded", before === "true" ? "false" : "true"); await control.click(); await expect(control).toHaveAttribute("aria-expanded", before!); }
  await page.getByRole("button", { name: "المساعد الذكي", exact: true }).click();
  const assistant = page.locator('section[aria-label="المساعد الذكي"]');
  await expect(assistant).toBeVisible();
  await assistant.locator("input").fill("سؤال واجهة محلي");
  await assistant.getByRole("button", { name: "إرسال الرسالة", exact: true }).click();
  await expect(assistant.getByText("جواب اصطناعي لاختبار الواجهة", { exact: true })).toBeVisible();
  await assistant.getByRole("button", { name: /إغلاق/ }).click();
  await expect(assistant).toHaveCount(0);
  await page.goto("/parties");
  await page.locator('main input').fill("جهة");
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await expect(page.getByRole("heading", { name: "جهة مدنية تجريبية", exact: true })).toBeVisible();
  await authenticate(context, "super_admin");
  await page.route("**/api/admin/news/refresh", route => route.fulfill({ status: 503, json: { ok: false, error: { message: "QA news refresh unavailable" } } }));
  await page.goto("/admin/news");
  await page.getByRole("button", { name: "تحديث الأخبار الآن", exact: true }).click();
  await expect(page.getByText("QA news refresh unavailable", { exact: true })).toBeVisible();
});
