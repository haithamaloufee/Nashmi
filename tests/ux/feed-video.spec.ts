import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function videoFeed(page: Page, language = "ar", mixed = false) {
  await page.addInitScript(language => localStorage.setItem("nashmi-language", language), language);
  // Clone only isolated synthetic QA posts, without writing to any database.
  await page.route("**/api/updates?*", async route => {
    const response = await route.fetch();
    const json = await response.json();
    const updates = json.data.updates;
    const video = updates.find((row: any) => row.item.mediaIds?.some((media: any) => media.mimeType?.startsWith("video/")));
    const photo = updates.find((row: any) => row.item.mediaIds?.some((media: any) => media.mimeType?.startsWith("image/")));
    expect(video, "Real local video fixture must exist").toBeTruthy();
    const clone = (row: any, id: number) => ({ ...row, item: { ...row.item, _id: `00000000000000000000000${id}`, content: "وسائط محلية اصطناعية لاختبار مشغّل الفيديو.", mediaIds: row.item.mediaIds.map((media: any) => ({ ...media, url: media.url + `?feed-video-test=${id}` })) } });
    json.data.updates = [clone(photo, 1), clone(photo, 2), clone(photo, 3), clone(video, 4), clone(photo, 5), clone(video, 6)];
    if (mixed) json.data.updates[3].item.mediaIds.push(clone(photo, 7).item.mediaIds[0]);
    json.data.totalCount = 6; json.nextCursor = null;
    await route.fulfill({ response, json });
  });
  await page.goto("/updates");
  await page.locator("[data-feed-region]").getByRole("button", { name: language === "ar" ? "منشورات" : "Posts", exact: true }).click();
  await expect(page.locator("[data-feed-video]")).toHaveCount(2);
}

for (const language of ["ar", "en"]) for (const width of [390, 1440]) {
  test(`feed video autoplay, controls and scroll ${language} ${width}`, async ({ page, context }, info) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    const mediaRequests: string[] = [];
    page.on("request", request => { if (new URL(request.url()).pathname.endsWith(".mp4")) mediaRequests.push(request.url()); });
    await videoFeed(page, language);
    const players = page.locator("[data-feed-video]");
    const first = players.nth(0); const second = players.nth(1);
    const video = first.locator("video");
    expect(await video.evaluate((v: HTMLVideoElement) => v.controls)).toBe(false);
    await expect(video).not.toHaveAttribute("src");
    expect(mediaRequests).toEqual([]);
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    await expect(second.locator("video")).not.toHaveAttribute("src");
    const pause = language === "ar" ? "إيقاف الفيديو مؤقتًا" : "Pause video";
    const play = language === "ar" ? "تشغيل الفيديو" : "Play video";
    await first.getByRole("button", { name: pause, exact: true }).last().click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.evaluate(() => scrollBy(0, 25));
    await page.waitForTimeout(300);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await first.getByRole("button", { name: play, exact: true }).last().focus();
    await page.keyboard.press("Space");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    await first.getByRole("button", { name: language === "ar" ? "تشغيل الصوت" : "Unmute audio", exact: true }).click();
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    await first.getByRole("button", { name: language === "ar" ? "كتم الصوت" : "Mute audio", exact: true }).click();
    await first.getByRole("button", { name: pause, exact: true }).last().click();
    const seek = first.getByRole("slider");
    await seek.fill("2");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.abs(v.currentTime - 2))).toBeLessThan(0.3);
    await seek.focus(); await page.keyboard.press("ArrowRight");
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(2);
    const axe = await new AxeBuilder({ page }).include("[data-feed-video]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    await first.screenshot({ path: `test-results/feed-video-${language}-${width}-${info.project.name}.png` });
    if (info.project.name === "chromium") await expect(first).toHaveScreenshot(`feed-video-${language}-${width}.png`, { animations: "disabled", maxDiffPixelRatio: 0.005 });
    await second.locator("video").scrollIntoViewIfNeeded();
    await expect.poll(() => second.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    expect(await page.locator("video").evaluateAll(videos => videos.filter(v => !(v as HTMLVideoElement).paused).length)).toBe(1);
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(() => page.locator("video").evaluateAll(videos => videos.every(v => (v as HTMLVideoElement).paused))).toBe(true);
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("reduced motion prevents autoplay, but manual playback works", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await videoFeed(page);
  const player = page.locator("[data-feed-video]").first();
  const video = player.locator("video");
  await video.scrollIntoViewIfNeeded();
  await expect(video).not.toHaveAttribute("src");
  await player.getByRole("button", { name: "تشغيل الفيديو", exact: true }).last().click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
});

test("blocked autoplay falls back to a working play button", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let denied = false;
    HTMLMediaElement.prototype.play = function () {
      if (!denied) { denied = true; return Promise.reject(new DOMException("Autoplay denied", "NotAllowedError")); }
      return original.call(this);
    };
  });
  await videoFeed(page);
  const player = page.locator("[data-feed-video]").first();
  const video = player.locator("video");
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("src");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await player.getByRole("button", { name: "تشغيل الفيديو", exact: true }).last().click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
});

test("data saver defers downloads until the user chooses playback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
  await videoFeed(page);
  const player = page.locator("[data-feed-video]").first();
  const video = player.locator("video");
  await video.scrollIntoViewIfNeeded();
  await expect(video).not.toHaveAttribute("src");
  await player.getByRole("button", { name: "تشغيل الفيديو", exact: true }).last().click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
});

test("rapid scrolling during video source activation leaves it paused", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/forest.mp4?*", async route => { await new Promise(resolve => setTimeout(resolve, 800)); await route.continue(); });
  await videoFeed(page);
  const video = page.locator("[data-feed-video] video").first();
  await video.scrollIntoViewIfNeeded();
  // WebKit's platform media loader may not emit Playwright request events.
  await expect(video).toHaveAttribute("src", /forest\.mp4/);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1200);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
});

test("leaving the feed disposes playback and returning restores controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await videoFeed(page);
  const video = page.locator("[data-feed-video] video").first();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
  await page.evaluate(() => { (window as Window & { previousFeedVideo?: HTMLVideoElement }).previousFeedVideo = document.querySelector("[data-feed-video] video") as HTMLVideoElement; });
  await page.locator('a[href="/welcome"]').first().click();
  await expect(page).toHaveURL(/\/welcome$/);
  expect(await page.evaluate(() => (window as Window & { previousFeedVideo?: HTMLVideoElement }).previousFeedVideo?.paused)).toBe(true);
  await page.goBack();
  await expect(page.locator("[data-feed-video]")).toHaveCount(2);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
  expect(errors).toEqual([]);
});

test("fullscreen controls enter and exit the actual player", async ({ page }, info) => {
  test.skip(info.project.name === "webkit", "Headless WebKit does not expose the platform fullscreen UI; inline controls are covered.");
  await videoFeed(page);
  const player = page.locator("[data-feed-video]").first();
  await player.scrollIntoViewIfNeeded();
  await player.getByRole("button", { name: "ملء الشاشة", exact: true }).click();
  await expect.poll(() => player.evaluate(el => document.fullscreenElement === el)).toBe(true);
  await player.getByRole("button", { name: "الخروج من ملء الشاشة", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});

test("a video beside an image keeps mobile controls inside its frame", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await videoFeed(page, "ar", true);
  const player = page.locator("[data-feed-video]").first();
  await player.scrollIntoViewIfNeeded();
  const box = (await player.boundingBox())!;
  for (const control of await player.locator("button,input").all()) {
    const rect = (await control.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(box.x - 1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height + 1);
  }
  await player.getByRole("button", { name: "تشغيل الفيديو", exact: true }).last().click();
  await expect.poll(() => player.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
});

test("the sticky mobile navbar does not count as visible video space", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await videoFeed(page);
  const video = page.locator("[data-feed-video] video").first();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
  await video.evaluate(v => scrollBy(0, v.getBoundingClientRect().top));
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("simulated document visibility pauses and resumes the eligible video", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await videoFeed(page);
  const video = page.locator("[data-feed-video] video").first();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.2);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.evaluate(() => { Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
});
