import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

for (const role of ["party", "iec"]) test(`baseline ${role}: publish, edit, cancel and delete only a synthetic owned post`, async ({ page, context }) => {
  await authenticate(context, role);
  await page.goto(`/${role === "party" ? "party" : "iec"}-dashboard/posts`);
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  const marker = `UX-local-${role}-${Date.now()}`;
  await page.locator('main textarea[name="content"]').fill(marker);
  const creation = page.waitForResponse(r => r.url().endsWith("/api/posts") && r.request().method() === "POST");
  await page.locator('main form').first().getByRole("button", { name: "نشر", exact: true }).click();
  const response = await creation;
  expect(response.status()).toBe(201);
  const id = (await response.json()).data.post._id;
  try {
    // Await the committed dashboard refresh, not only its preceding POST response.
    await expect(page.locator("main article").filter({ hasText: marker }).first()).toBeVisible();
    await page.goto(`/updates?search=${marker}`);
    const card = page.locator("article").filter({ hasText: marker }).first();
    await card.getByRole("button", { name: "إجراءات المحتوى", exact: true }).click();
    await card.getByRole("menuitem", { name: "تعديل", exact: true }).click();
    await page.getByPlaceholder("نص المنشور", { exact: true }).fill(marker + " edited");
    const edit = page.waitForResponse(r => r.url().endsWith(`/posts/${id}`) && r.request().method() === "PATCH");
    await card.getByRole("button", { name: "حفظ", exact: true }).click();
    expect((await edit).ok()).toBe(true);
    await expect(card.getByText(marker + " edited", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "إجراءات المحتوى", exact: true }).click();
    await card.getByRole("menuitem", { name: "حذف", exact: true }).click();
    await card.getByRole("button", { name: "إلغاء", exact: true }).click();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "إجراءات المحتوى", exact: true }).click();
    await card.getByRole("menuitem", { name: "حذف", exact: true }).click();
    const deletion = page.waitForResponse(r => r.url().endsWith(`/posts/${id}`) && r.request().method() === "DELETE");
    await page.getByRole("dialog").getByRole("button", { name: "حذف", exact: true }).click();
    expect((await deletion).ok()).toBe(true);
    await expect(card).toHaveCount(0);
  } finally {
    await context.request.delete(`/api/posts/${id}`, { data: { reason: "Synthetic QA cleanup" } });
  }
});
