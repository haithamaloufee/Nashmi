import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { authenticate, fixtures, protectedRoutes, publicRoutes } from "./helpers";

test("baseline route, controls, console and accessibility inventory", async ({ page, context }, info) => {
  test.setTimeout(900_000);
  const inventory: any[] = process.env.UX_QA_RESUME && existsSync("test-results/baseline/inventory.json") ? JSON.parse(readFileSync("test-results/baseline/inventory.json", "utf8")).inventory : [];
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => { if (!request.failure()?.errorText.includes("ERR_ABORTED")) requests.push(`${request.url()} ${request.failure()?.errorText}`); });
  mkdirSync("test-results/baseline", { recursive: true });
  const routes = [...publicRoutes, `/users/${fixtures().citizenId}`];
  async function audit(route: string, role = "guest") {
    for (const width of [390, 1440]) {
      if (inventory.some(row => row.route === route && row.role === role && row.width === width)) continue;
      await page.setViewportSize({ width, height: 900 });
      console.log(`Audit ${role} ${route} ${width}`);
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      if (route === "/register") await page.waitForURL("**/signup");
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      const data = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, h1: document.querySelector("h1")?.textContent, controls: [...document.querySelectorAll("button,a,input,textarea,select,summary")].map(el => ({ tag: el.tagName, name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 90), href: el.getAttribute("href"), type: el.getAttribute("type") })) }));
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      inventory.push({ route, role, width, status: response?.status(), finalUrl: page.url(), ...data, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
      writeFileSync("test-results/baseline/inventory.json", JSON.stringify({ inventory, errors, requests }, null, 2));
      if (routes.indexOf(route) < 0 || ["/updates", "/login", "/signup", "/parties", "/iec", "/"].includes(route)) await page.screenshot({ path: `test-results/baseline/${role}-${route.replace(/[^a-z0-9]/gi, "_") || "home"}-${width}.png`, fullPage: true });
      expect(data.overflow, `${role} ${route} ${width} overflow`).toBe(false);
    }
  }
  for (const route of routes) await audit(route);
  for (const [role, pages] of Object.entries(protectedRoutes)) {
    await authenticate(context, role);
    for (const route of pages) await audit(route, role);
  }
  writeFileSync("test-results/baseline/inventory.json", JSON.stringify({ inventory, errors, requests }, null, 2));
  await info.attach("route-controls-and-axe-inventory", { path: "test-results/baseline/inventory.json", contentType: "application/json" });
});

test("baseline primary Home points to the social feed", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.locator('nav[aria-label="التنقل الرئيسي"]').getByRole("link", { name: "الرئيسية", exact: true })).toHaveAttribute("href", "/updates");
});

test("baseline browser capabilities on local synthetic data", async ({ page }, info) => {
  const consoleMessages: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", message => { if (message.type() === "error") consoleMessages.push(message.text()); });
  page.on("requestfailed", request => failedRequests.push(request.url()));
  await page.goto("/updates", { waitUntil: "domcontentloaded" });
  await expect(page.locator("article").first()).toBeVisible();
  await page.getByRole("button", { name: "بحث متقدم" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("article").first().getByRole("button", { name: "تعليق", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "كتابة تعليق" })).toBeVisible();
  await page.getByRole("textbox", { name: "كتابة تعليق" }).fill("نص محلي للتحقق من الكتابة فقط");
  await page.locator("article").first().getByRole("button", { name: "مشاركة", exact: true }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('button[aria-controls="mobile-navigation"]').click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/signup");
  await page.locator('input[name="name"]').fill("مستخدم تجريبي");
  await page.locator('input[name="email"]').fill("ui-only@nashmi.test");
  await page.locator('input[name="password"]').fill("Nashmi-QA-2026!Only");
  await page.getByRole("button", { name: "إظهار كلمة المرور" }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");
  await page.screenshot({ path: "test-results/baseline/browser-capabilities.png" });
  await info.attach("console-and-requests", { body: JSON.stringify({ consoleMessages, failedRequests }), contentType: "application/json" });
});
