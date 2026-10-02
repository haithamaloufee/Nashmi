import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { authenticate, fixtures, protectedRoutes, publicRoutes } from "./helpers";

test.use({ video: "off" });

for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) test(`all frontend routes: mobile, desktop, named controls and WCAG audit ${language} ${theme}`, async ({ page, context }, info) => {
  test.setTimeout(1_200_000);
  test.skip(info.project.name !== "chromium", "The exhaustive route matrix is recorded in Chromium; interactions run in all three engines.");
  const rows: any[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
  await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
  const routes = [...publicRoutes.map(route => ({ role: "guest", route })), { role: "guest", route: `/users/${fixtures().citizenId}` }, ...Object.entries(protectedRoutes).flatMap(([role, routes]) => routes.map(route => ({ role, route })))];
  mkdirSync("test-results/final", { recursive: true });
  let currentRole = "guest";
  for (const { route, role } of routes) {
    if (role !== currentRole) { await authenticate(context, role); currentRole = role; }
    for (const width of [390, 1440]) {
      console.log(`Final audit ${role} ${route} ${width}`);
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      if (route === "/register") await page.waitForURL("**/signup");
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      if (route === "/updates") {
        await expect(page.locator("[data-feed-region] input.social-search-input[aria-label]")).toBeEnabled();
        await expect.poll(() => page.locator('[data-feed-region] button[aria-pressed="true"]').evaluate(element => getComputedStyle(element).opacity)).toBe("1");
      }
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark).*$/);
      await expect(page.locator("main").first()).toBeVisible();
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      rows.push({ route, role, width, status: response?.status(), url: page.url(), overflow, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
      writeFileSync(`test-results/final/routes-${language}-${theme}.json`, JSON.stringify({ rows, errors }, null, 2));
    }
  }
  await info.attach("all-routes-wcag", { path: `test-results/final/routes-${language}-${theme}.json`, contentType: "application/json" });
  expect(errors).toEqual([]);
  expect(rows.filter(row => row.status >= 400 || row.overflow || row.violations.length)).toEqual([]);
});

for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`visual and accessibility ${language} ${theme} ${width}`, async ({ page, context }, info) => {
    test.skip(info.project.name !== "chromium", "Reviewed visual reference images are available for Chromium on Windows.");
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: new Date("2026-10-01T00:00:00Z") });
    for (const route of ["/updates", "/login", "/signup", "/parties", "/parties/qa-civic", "/iec"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark).*$/);
      if (route === "/updates") {
        await expect(page.locator("[data-feed-region] input.social-search-input[aria-label]")).toBeEnabled();
        await expect.poll(() => page.locator('[data-feed-region] button[aria-pressed="true"]').evaluate(element => getComputedStyle(element).opacity)).toBe("1");
      }
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), `${route} ${language} ${theme}`).toEqual([]);
      await expect(page).toHaveScreenshot(`${route.replace(/\W/g, "_")}-${language}-${theme}-${width}.png`, { animations: "disabled", maxDiffPixelRatio: 0.005, mask: [page.locator("[data-visual-dynamic]"), page.locator("nextjs-portal"), page.locator("video")] });
    }
  });
}
