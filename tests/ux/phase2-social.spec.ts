import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { authenticate } from "./helpers";

test("rich QA media opens uncropped viewer, restores focus, and plays real local video", async ({ page }) => {
  const fixtures = JSON.parse(readFileSync("test-results/phase2/social-fixtures.json", "utf8"));
  expect(fixtures.entries).toHaveLength(10);
  await page.goto("/updates");
  await expect(page.locator("[data-feed-region] input[aria-label]")).toBeEnabled();
  const post = (kind: string) => page.locator(`[data-feed-item="post-${fixtures.entries.find((entry: any) => entry.kind === kind).id}"]`);
  const gallery = post("gallery");
  await gallery.scrollIntoViewIfNeeded();
  const trigger = gallery.locator('[data-post-media] button').first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "عارض الصور", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("1 / 3");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("status")).toHaveText("2 / 3");
  await dialog.locator("button").last().focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  const video = post("video").locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  expect(await video.evaluate((el: HTMLVideoElement) => el.autoplay)).toBe(false);
  await video.scrollIntoViewIfNeeded();
  await video.evaluate(async (el: HTMLVideoElement) => { el.muted = true; await el.play(); });
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0.1);
  expect(await video.evaluate((el: HTMLVideoElement) => el.videoWidth / el.videoHeight)).toBeCloseTo(16 / 9, 1);
  await video.evaluate((el: HTMLVideoElement) => el.pause());
});

test("local rich survey stays in feed and opens the role-aware response form", async ({ page, context }) => {
  await authenticate(context, "citizen");
  await page.goto("/updates?filter=surveys");
  const card = page.locator("article").filter({ hasText: "كيف نجعل المعلومات المدنية أسهل؟" });
  await card.getByRole("link", { name: "المشاركة في الاستبيان" }).click();
  await expect(page).toHaveURL(/\/surveys\/qa-social-survey$/);
  // The existing response UI is exercised separately by survey-types preservation tests.
  await expect(page.locator("main")).toContainText("ما مدى وضوح المعلومات؟");
  await expect(page.locator("main")).toContainText("اقترح تحسينًا واحدًا");
});

for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`phase2 public surfaces ${language} ${theme} ${width}`, async ({ page, context }, info) => {
    test.setTimeout(240_000);
    test.skip(info.project.name !== "chromium", "Visual reference review uses Chromium; real media interactions run in three engines.");
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
    await page.setViewportSize({ width, height: 900 });
    mkdirSync("test-results/phase2/surfaces", { recursive: true });
    for (const route of ["/updates", "/login", "/signup", "/parties", "/parties/qa-civic", "/iec", "/laws", "/chat"]) {
      await page.goto(route);
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      if (route === "/updates") await expect(page.locator("[data-feed-region] input[aria-label]")).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), route).toEqual([]);
      await page.screenshot({ path: `test-results/phase2/surfaces/${route.replaceAll('/', '_')}-${language}-${theme}-${width}.png`, animations: "disabled" });
    }
  });
}

