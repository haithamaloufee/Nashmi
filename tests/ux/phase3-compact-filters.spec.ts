import { test, expect } from "@playwright/test";

for (const language of ["ar", "en"]) for (const width of [390, 1440]) {
  test(`compact feed filters preserve sorting ${language} ${width}`, async ({ page, context }, info) => {
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(language => {
      localStorage.setItem("nashmi-language", language);
      localStorage.setItem("nashmi-theme", "light");
    }, language);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/updates");
    const feed = page.locator("[data-feed-region]");
    const search = feed.getByRole("textbox").first();
    await expect(search).toBeEnabled();
    const trigger = feed.getByRole("button", { name: language === "ar" ? "بحث متقدم" : "Advanced Search", exact: true });
    const inputBox = (await search.boundingBox())!;
    const filterBox = (await trigger.boundingBox())!;
    expect(Math.abs(inputBox.y - filterBox.y)).toBeLessThan(2);
    expect(filterBox.width).toBeGreaterThanOrEqual(44);
    expect(filterBox.height).toBeGreaterThanOrEqual(44);
    expect(language === "ar" ? filterBox.x < inputBox.x : filterBox.x > inputBox.x).toBe(true);
    await expect(feed.getByRole("combobox")).toHaveCount(0);
    await page.screenshot({ path: `test-results/compact-filters-${language}-${width}-${info.project.name}.png` });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    const sort = dialog.getByRole("combobox", { name: language === "ar" ? "فرز حسب" : "Sort By", exact: true });
    await expect(sort).toHaveValue("newest");
    await expect(sort.locator("option")).toHaveCount(5);
    const change = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/updates" && url.searchParams.get("sort") === "oldest";
    });
    await sort.selectOption("oldest");
    expect((await change).ok()).toBe(true);
    await page.screenshot({ path: `test-results/compact-filter-dialog-${language}-${width}-${info.project.name}.png` });
    await dialog.getByRole("button", { name: language === "ar" ? "تطبيق البحث" : "Apply Search", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(sort).toHaveValue("oldest");
    const reset = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/updates" && url.searchParams.get("sort") === "newest";
    });
    await dialog.getByRole("button", { name: language === "ar" ? "إعادة الضبط" : "Reset", exact: true }).click();
    expect((await reset).ok()).toBe(true);
    await expect(sort).toHaveValue("newest");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  });
}
