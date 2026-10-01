import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { authenticate, fixtures } from "./helpers";
for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
  test(`phase2 profiles and dashboard surfaces ${language} ${theme} ${width}`, async ({ page, context }, info) => {
    test.setTimeout(240_000);
    test.skip(info.project.name !== "chromium", "The supporting visual mode matrix uses Chromium.");
    await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
    await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
    await page.setViewportSize({ width, height: 900 });
    mkdirSync("test-results/phase2/profiles", { recursive: true });
    for (const [role, route] of [["citizen", `/users/${fixtures().citizenId}`], ["citizen", "/account"], ["party", "/party-dashboard"], ["iec", "/iec-dashboard"], ["super_admin", "/admin"]]) {
      await authenticate(context, role);
      const response = await page.goto(route);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), route).toEqual([]);
      await page.screenshot({ path: `test-results/phase2/profiles/${route.startsWith('/users/') ? '_public-user' : route.replaceAll('/', '_')}-${language}-${theme}-${width}.png` });
    }
  });
}
