import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

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
