import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { authenticate, fixtures, protectedRoutes, publicRoutes } from "./helpers";

test("phase3 all routes, role controls, console and accessibility inventory", async ({ page, context }, info) => {
  test.setTimeout(900_000);
  const inventory: any[] = process.env.UX_QA_RESUME && existsSync("test-results/phase3/inventory/inventory.json") ? JSON.parse(readFileSync("test-results/phase3/inventory/inventory.json", "utf8")).inventory : [];
  const errors: string[] = [];
  const requests: string[] = [];
  const consoleMessages: Array<{ route: string; level: string; text: string }> = [];
  page.on("console", message => {
    if (["warning", "error"].includes(message.type())) consoleMessages.push({ route: page.url(), level: message.type(), text: message.text() });
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => { if (!request.failure()?.errorText.includes("ERR_ABORTED")) requests.push(`${request.url()} ${request.failure()?.errorText}`); });
  mkdirSync("test-results/phase3/inventory", { recursive: true });
  const routes = [...publicRoutes, "/welcome", `/users/${fixtures().citizenId}`];
  async function audit(route: string, role = "guest") {
    for (const width of [390, 1440]) {
      if (inventory.some(row => row.route === route && row.role === role && row.width === width)) continue;
      await page.setViewportSize({ width, height: 900 });
      console.log(`Audit ${role} ${route} ${width}`);
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      if (route === "/") await page.waitForURL("**/updates");
      if (route === "/register") await page.waitForURL("**/signup");
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      const data = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, h1: document.querySelector("h1")?.textContent, controls: [...document.querySelectorAll("button,a,input,textarea,select,summary")].map(el => ({ tag: el.tagName, name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 90), href: el.getAttribute("href"), type: el.getAttribute("type") })) }));
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      inventory.push({ route, role, width, status: response?.status(), finalUrl: page.url(), ...data, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
      writeFileSync("test-results/phase3/inventory/inventory.json", JSON.stringify({ inventory, errors, requests, consoleMessages }, null, 2));
      if (routes.indexOf(route) < 0 || ["/updates", "/login", "/signup", "/parties", "/iec", "/"].includes(route)) await page.screenshot({ path: `test-results/phase3/inventory/${role}-${route.replace(/[^a-z0-9]/gi, "_") || "home"}-${width}.png`, fullPage: true });
      expect(data.overflow, `${role} ${route} ${width} overflow`).toBe(false);
    }
  }
  for (const route of routes) await audit(route);
  const roleRoutes = { ...protectedRoutes, admin: protectedRoutes.super_admin };
  for (const [role, pages] of Object.entries(roleRoutes)) {
    await authenticate(context, role);
    for (const route of pages) await audit(route, role);
  }
  writeFileSync("test-results/phase3/inventory/inventory.json", JSON.stringify({ inventory, errors, requests, consoleMessages }, null, 2));
  expect(inventory).toHaveLength(110);
  expect(inventory.filter(row => row.violations.length)).toEqual([]);
  expect(errors).toEqual([]);
  await info.attach("route-controls-and-axe-inventory", { path: "test-results/phase3/inventory/inventory.json", contentType: "application/json" });
});
