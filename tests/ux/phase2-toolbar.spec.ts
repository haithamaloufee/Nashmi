import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

for (const language of ["ar", "en"]) for (const width of [320, 390, 1440]) {
  test(`search placeholder and sort text fit ${language} ${width}`, async ({ page, context }, info) => {
    test.skip(info.project.name !== "chromium", "Text metrics and screenshots use Chromium.");
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(language => localStorage.setItem("nashmi-language", language), language);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/updates");
    await expect(page.locator("[data-feed-region] input[aria-label]")).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const fits = (el: HTMLInputElement | HTMLSelectElement) => {
      const style = getComputedStyle(el);
      const canvas = document.createElement("canvas");
      const drawing = canvas.getContext("2d")!;
      drawing.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const text = el instanceof HTMLSelectElement ? el.selectedOptions[0].text : el.placeholder;
      return { textWidth: drawing.measureText(text).width, available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
    };
    const search = page.locator("[data-feed-region] input[aria-label]");
    const result = await search.evaluate(fits);
    expect(result.textWidth).toBeLessThanOrEqual(result.available);
    const sort = page.locator("[data-feed-region] select").first();
    for (const value of ["newest", "oldest", "mostCommented", "mostLiked", "pollsEndingSoon"]) {
      await sort.selectOption(value);
      const result = await sort.evaluate(fits);
      expect(result.textWidth, value).toBeLessThanOrEqual(result.available);
    }
    await sort.selectOption("newest");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    mkdirSync("test-results/phase2/toolbar", { recursive: true });
    await page.screenshot({ path: `test-results/phase2/toolbar/${language}-${width}.png` });
  });
}
