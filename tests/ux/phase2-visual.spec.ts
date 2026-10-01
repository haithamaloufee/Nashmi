import { test, expect } from "@playwright/test";
for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`phase2 visual regression ${language} ${theme} ${width}`, async ({ page, context }, info) => {
    test.setTimeout(240_000);
    test.skip(info.project.name !== "chromium", "New reviewed reference set is separate from Phase 1.");
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: new Date("2026-10-01T12:00:00Z") });
    for (const route of ["/updates", "/login", "/signup", "/parties", "/parties/qa-civic", "/iec"]) {
      await page.goto(route);
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      if (route === "/updates") await expect(page.locator("[data-feed-region] input[aria-label]")).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.locator('main img').evaluateAll(nodes => nodes.filter(el => el.getBoundingClientRect().top < innerHeight && el.getBoundingClientRect().bottom > 0).every(el => (el as HTMLImageElement).complete))).toBe(true);
      await expect(page).toHaveScreenshot(`${route.replaceAll('/', '_')}-${language}-${theme}-${width}.png`, { animations: "disabled", maxDiffPixelRatio: 0.005, mask: [page.locator('[data-visual-dynamic]'), page.locator('[data-visual-counts]'), page.locator('nextjs-portal'), page.locator('video')] });
    }
  });
}
