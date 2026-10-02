import { test, expect } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`leaving the assistant through navigation has no observer errors at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/chat");
    await expect(page.getByRole("textbox", { name: "رسالة إلى المساعد الذكي", exact: true })).toBeEnabled();
    await page.locator('a[aria-label="Nashmi home"]').click();
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.locator("main#top")).toBeVisible();
    await expect(page.locator(".chat-page")).toHaveCount(0);
    await page.locator('nav[aria-label] a[href="/chat"]').first().click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByRole("textbox", { name: "رسالة إلى المساعد الذكي", exact: true })).toBeEnabled();
    await page.locator('nav[aria-label] a[href="/updates"]').first().click();
    await expect(page).toHaveURL(/\/updates$/);
    await expect(page.locator("[data-feed-region] input.social-search-input[aria-label]")).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
