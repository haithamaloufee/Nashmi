import { test, expect } from "@playwright/test";
test("touch-only phone controls, media and short viewport composer stay usable", async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: info.project.name !== "firefox", reducedMotion: "reduce", baseURL: "http://127.0.0.1:3020" });
  try {
    const page = await context.newPage();
    await page.goto("/updates");
    await expect(page.locator("[data-feed-region] input[aria-label]")).toBeEnabled();
    await page.locator('button[aria-controls="mobile-navigation"]').tap();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await page.keyboard.press("Escape");
    const card = page.locator("article").first();
    await card.locator('[data-post-media] button').tap();
    const viewer = page.getByRole("dialog", { name: "عارض الصور", exact: true });
    await expect(viewer).toBeVisible();
    await viewer.getByRole("button", { name: "إغلاق", exact: true }).tap();
    await card.locator('button[aria-controls^="comments-"]').tap();
    const composer = card.locator("textarea");
    await composer.tap();
    await composer.fill("مسودة لمس محلية\nسطر ثانٍ");
    await page.setViewportSize({ width: 390, height: 430 });
    await composer.scrollIntoViewIfNeeded();
    const box = (await composer.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(101);
    expect(box.y + box.height).toBeLessThanOrEqual(430);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.screenshot({ path: info.outputPath("touch-short-viewport.png") });
  } finally { await context.close(); }
});
