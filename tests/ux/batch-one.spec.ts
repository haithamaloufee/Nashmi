import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

test("signup validates in English, focuses the invalid field and retains drafts on failure", async ({ page, context }) => {
  await context.addCookies([{ name: "nashmi-language", value: "en", url: "http://127.0.0.1:3020" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  const form = page.locator("main form");
  await form.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(form.locator('[name="name"]')).toBeFocused();
  await expect(page.getByText("Enter your name.", { exact: true })).toBeVisible();
  await form.locator('[name="name"]').fill("QA Citizen");
  await form.locator('[name="email"]').fill("signup-ui@nashmi.test");
  await form.locator('[name="password"]').fill("Nashmi-QA-2026!Only");
  await form.locator('[name="confirmPassword"]').fill("Nashmi-QA-2026!Only");
  await page.route("**/api/auth/signup", route => route.fulfill({ status: 503, json: { ok: false, error: { message: "Synthetic signup failure" } } }));
  await form.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(form).toContainText("Synthetic signup failure");
  await expect(form.locator('[name="email"]')).toHaveValue("signup-ui@nashmi.test");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.screenshot({ path: test.info().outputPath("signup-mobile-en.png"), fullPage: true });
});

for (const role of ["party", "iec", "super_admin"]) test(`${role} dashboard has compact mobile navigation, all routes and active state`, async ({ page, context }) => {
  await authenticate(context, role);
  const base = role === "party" ? "/party-dashboard" : role === "iec" ? "/iec-dashboard" : "/admin";
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    const nav = page.getByRole("navigation", { name: "تنقل لوحة التحكم", exact: true });
    await expect(nav.locator(`a[href="${base}"]`)).toHaveAttribute("aria-current", "page");
    await expect(nav.locator("a")).toHaveCount(role === "party" ? 5 : role === "iec" ? 6 : 11);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    const bounds = await page.locator("main > aside, main > section").evaluateAll(nodes => nodes.map(node => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
    expect(bounds.every(box => box.left >= -1 && box.right <= width + 1), "dashboard columns must fit without clipping").toBe(true);
    if (width === 390) expect((await page.locator("main > aside").boundingBox())!.height).toBeLessThan(170);
    await page.screenshot({ path: test.info().outputPath(`${role}-${width}.png`), fullPage: true });
  }
});

test("query-only report filters finish without the twelve-second blocking skeleton", async ({ page, context }) => {
  await authenticate(context, "super_admin");
  await page.goto("/admin/reports");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  await page.locator("main").getByRole("link", { name: "المفتوحة", exact: true }).click();
  await expect(page).toHaveURL(/status=open/);
  await expect(page.locator('div.fixed[aria-busy="true"]')).toHaveCount(0, { timeout: 2000 });
});
