import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

test("account table network failure retains committed data and enables retry", async ({ page, context }) => {
  await authenticate(context, "super_admin");
  await page.route("**/api/admin/users/*/status", route => route.abort("connectionfailed"));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin/users?q=citizen%40nashmi.test");
  await page.getByRole("button", { name: "إخفاء المساعد حتى إعادة تحميل الصفحة", exact: true }).click();
  const row = page.locator("main tbody tr").filter({ hasText: "citizen@nashmi.test" });
  const form = row.locator("form").filter({ has: page.locator('[name="status"]') });
  const save = form.getByRole("button", { name: "حفظ", exact: true });
  await expect(save).toBeEnabled();
  await expect(row.locator("td").nth(3)).toHaveText("active");
  await form.locator("select").selectOption("disabled");
  await save.click();
  await expect(row.getByText("تعذر الاتصال بالخادم", { exact: true })).toBeVisible();
  await expect(row.locator("td").nth(3)).toHaveText("active");
  await expect(form.locator("select")).toHaveValue("disabled");
  await expect(save).toBeEnabled();
  expect(errors).toEqual([]);
});

test("survey status network failure shows retryable feedback without an unhandled exception", async ({ page, context }) => {
  await authenticate(context, "party");
  await page.route("**/api/surveys/*", route => route.request().method() === "PATCH" ? route.abort("failed") : route.continue());
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/party-dashboard/surveys");
  const close = page.locator("main article").first().getByRole("button", { name: "إغلاق", exact: true });
  await close.click();
  await expect(page.getByText("تعذر الاتصال بالخادم.", { exact: true })).toBeVisible();
  await expect(close).toBeEnabled();
  expect(errors).toEqual([]);
});

test("news refresh network failure clears busy state and preserves diagnostics controls", async ({ page, context }) => {
  await authenticate(context, "super_admin");
  await page.route("**/api/admin/news/refresh", route => route.abort("failed"));
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/admin/news");
  const refresh = page.getByRole("button", { name: "تحديث الأخبار الآن", exact: true });
  await refresh.click();
  await expect(page.getByText("تعذر الاتصال بالخادم. حاول مرة أخرى.", { exact: true })).toBeVisible();
  await expect(refresh).toBeEnabled();
  expect(errors).toEqual([]);
});
