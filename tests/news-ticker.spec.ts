import { test, expect } from "@playwright/test";

for (const count of [0, 1, 10, 15, 20, 25]) {
  test(`news ticker preserves layout and accessible identity with ${count} items`, async ({ page }) => {
    const items = Array.from({ length: count }, (_, index) => ({ id: (index + 1).toString(16).padStart(24, "0"), newsId: (index + 1).toString(16).padStart(24, "0"), titleAr: `اجتماع لجنة نيابية موثق لمناقشة الخدمات العامة رقم ${index + 1}`, summaryAr: "عينة واجهة اصطناعية لا تكتب إلى أي قاعدة بيانات أو مصدر أخبار عام.", category: "parliament", urgency: "normal", publishedAt: new Date().toISOString(), sources: [{ publisher: "مجلس النواب", title: "مصدر اختبار الواجهة", url: "https://www.representatives.jo/AR/Modules/News", sourceClass: "official" }] }));
    await page.route("**/api/news/live", (route) => route.fulfill({ json: { ok: true, data: { items } } }));
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/welcome", { waitUntil: "domcontentloaded" });
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      const ticker = page.getByRole("region", { name: "آخر الأخبار" });
      if (!count) { await expect(ticker).toHaveCount(0); continue; }
      await expect(ticker).toBeVisible();
      await expect(ticker).toHaveCSS("height", width === 390 ? "46px" : "50px");
      await expect(ticker.locator('[data-original="true"]')).toHaveCount(Math.min(20, count));
      const first = ticker.locator('[data-original="true"]').first();
      await expect(first).toHaveAttribute("href", `/chat?news=${items[0].id}&fresh=1#chat-composer`);
      await first.focus();
      await expect(first).toBeFocused();
      await expect(ticker.locator(".news-ticker-track")).toHaveCSS("animation-play-state", "paused");
      await first.blur();
      await ticker.hover();
      await expect(ticker.locator(".news-ticker-track")).toHaveCSS("animation-play-state", "paused");
      const dimensions = await ticker.evaluate((element) => {
        const set = element.querySelector(".news-ticker-set")!;
        const window = element.querySelector(".news-ticker-window")!;
        const track = element.querySelector(".news-ticker-track")!;
        return { set: set.getBoundingClientRect().width, window: window.getBoundingClientRect().width, duration: parseFloat(getComputedStyle(track).animationDuration) };
      });
      expect(dimensions.set).toBeGreaterThanOrEqual(dimensions.window - 1);
      expect(dimensions.duration).toBeCloseTo(Math.max(18, dimensions.set / 58), 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(ticker.locator(".news-ticker-track")).toHaveCSS("animation-name", "none");
      await expect(ticker.locator('.news-ticker-set[aria-hidden="true"]')).toBeHidden();
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  });
}
