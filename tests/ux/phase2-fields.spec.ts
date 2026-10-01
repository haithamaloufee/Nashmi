import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { authenticate } from "./helpers";

for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`social fields and comments ${language} ${theme} ${width}`, async ({ page, context }) => {
    await authenticate(context, "citizen");
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/updates");
    await expect(page.locator("[data-feed-region] input[aria-label]")).toBeEnabled();
    const search = page.locator('header input[type="search"]');
    await expect(search).toBeVisible();
    expect(await search.evaluate(el => getComputedStyle(el).borderRadius)).toBe("9999px");
    await expect(page.locator('header a[href="/surveys"]')).toHaveCount(0);
    const card = page.locator("article").first();
    await card.locator('button[aria-controls^="comments-"]').click();
    const composer = card.locator("textarea");
    const before = (await composer.boundingBox())!.height;
    await composer.fill("سطر تجريبي\n".repeat(8));
    await expect.poll(async () => (await composer.boundingBox())!.height).toBeGreaterThan(before);
    expect((await composer.boundingBox())!.height).toBeLessThanOrEqual(144);
    await page.route("**/api/posts/*/comments", route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { ok: false, error: { message: "QA composer outage" } } }) : route.continue());
    await composer.press("Enter");
    await expect(card.getByRole("alert")).toContainText("QA composer outage");
    await expect(composer).toHaveValue("سطر تجريبي\n".repeat(8).trim());
    await card.locator('button[aria-controls^="comments-"]').click();
    await expect(composer).toHaveCount(0);
    await card.locator('button[aria-controls^="comments-"]').click();
    await expect(composer).toHaveValue("سطر تجريبي\n".repeat(8).trim());
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    mkdirSync("test-results/phase2/fields", { recursive: true });
    await page.screenshot({ path: `test-results/phase2/fields/${language}-${theme}-${width}.png`, fullPage: false });
  });
}

