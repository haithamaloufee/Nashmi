import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import mongoose from "mongoose";
import { authenticate } from "./helpers";
import { localDatabase } from "./local-db";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`post options preserve report dialog, keyboard and accessibility ${width} ${theme}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(theme => localStorage.setItem("nashmi-theme", theme), theme);
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  const card = page.locator("article").filter({ has: page.getByRole("button", { name: "خيارات المنشور", exact: true }) }).first();
  const options = card.getByRole("button", { name: "خيارات المنشور", exact: true });
  await expect(options.locator("svg.lucide-ellipsis-vertical")).toBeVisible();
  const size = await options.boundingBox();
  expect(size!.width).toBe(44);
  expect(size!.height).toBe(44);
  await options.click();
  const menu = card.getByRole("menu", { name: "خيارات المنشور", exact: true });
  const report = menu.getByRole("menuitem", { name: "إبلاغ", exact: true });
  await expect(menu.getByRole("menuitem")).toHaveCount(1);
  await expect(report).toBeFocused();
  const bounds = await menu.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  const audit = async () => {
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations.map(issue => issue.id)).toEqual([]);
  };
  await audit();
  await page.screenshot({ path: info.outputPath(`post-options-${width}-${theme}.png`) });
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(options).toBeFocused();
  await options.press("ArrowDown");
  await expect(report).toBeFocused();
  await report.press("Enter");
  const dialog = page.getByRole("dialog").filter({ has: page.locator('select[name="reason"]') });
  await expect(menu).toBeHidden();
  await expect(dialog).toBeFocused();
  await dialog.locator("select").selectOption("spam");
  await dialog.locator("textarea").fill("مسودة إبلاغ اختبارية؛ لا إرسال إلى الإنتاج");
  await audit();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(options).toBeFocused();
  await options.click();
  await page.locator('a[aria-label="Nashmi home"]').click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("menu", { name: "خيارات المنشور", exact: true })).toHaveCount(0);
});

for (const [role, dashboard] of [["citizen", null], ["party", "/party-dashboard"], ["iec", "/iec-dashboard"], ["admin", "/admin"], ["super_admin", "/admin"]] as const) test(`account menu keeps unique destinations for ${role}`, async ({ page, context }) => {
  await authenticate(context, role);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/updates");
  const trigger = page.locator('button[aria-controls="account-menu"]');
  await trigger.click();
  const menu = page.locator("#account-menu");
  await expect(menu.getByRole("link", { name: "الإعدادات", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link")).toHaveCount(dashboard ? 2 : 1);
  const hrefs = await menu.getByRole("link").evaluateAll(links => links.map(link => link.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(hrefs.length);
  await menu.getByRole("link", { name: "حسابي", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "حسابي", exact: true })).toBeVisible();
  await trigger.click();
  if (dashboard) {
    await expect(menu.getByRole("link", { name: "لوحة التحكم", exact: true })).toHaveAttribute("href", dashboard);
    await menu.getByRole("link", { name: "لوحة التحكم", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${dashboard}$`));
    await expect(page.locator("main").first()).toBeVisible();
    await trigger.click();
  }
  await expect(menu.getByRole("button", { name: "تسجيل الخروج", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const role of ["guest", "citizen", "party", "iec", "admin", "super_admin"]) test(`post options submit real local reports with existing permissions for ${role}`, async ({ page, context }) => {
  if (role !== "guest") await authenticate(context, role);
  const db = await localDatabase();
  let reportId: mongoose.Types.ObjectId | undefined;
  const details = `phase3-menu-${role}-${Date.now()}`;
  try {
    await page.goto("/updates");
    await expect(page.locator('[data-feed-region] input.social-search-input[aria-label]')).toBeEnabled();
    const card = page.locator("article").filter({ has: page.getByRole("button", { name: "خيارات المنشور", exact: true }) }).first();
    await card.getByRole("button", { name: "خيارات المنشور", exact: true }).click();
    await card.getByRole("menuitem", { name: "إبلاغ", exact: true }).click();
    const dialog = page.getByRole("dialog").filter({ has: page.locator('select[name="reason"]') });
    await dialog.locator("select").selectOption("spam");
    await dialog.locator("textarea").fill(details);
    if (role === "citizen") {
      await page.route("**/api/reports", route => route.abort("failed"), { times: 1 });
      await dialog.getByRole("button", { name: "حفظ", exact: true }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(dialog.locator("textarea")).toHaveValue(details);
      await expect(dialog.locator("select")).toHaveValue("spam");
      await expect(dialog.getByRole("button", { name: "حفظ", exact: true })).toBeEnabled();
    }
    const submitted = page.waitForResponse(response => response.url().endsWith("/api/reports") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "حفظ", exact: true }).click();
    const response = await submitted;
    expect(response.status()).toBe(role === "guest" ? 401 : 201);
    if (role === "guest") {
      await expect(page.getByRole("dialog")).toHaveCount(2);
      expect(await db.collection("reports").countDocuments({ details })).toBe(0);
    } else {
      reportId = new mongoose.Types.ObjectId((await response.json()).data.report._id);
      const saved = await db.collection("reports").findOne({ _id: reportId });
      expect(saved?.details).toBe(details);
      expect(saved?.reason).toBe("spam");
      await expect(dialog).toBeHidden();
    }
  } finally {
    if (reportId) {
      await db.collection("reports").deleteOne({ _id: reportId });
      await db.collection("auditlogs").deleteMany({ "metadata.reportId": { $in: [reportId, String(reportId)] } });
    }
    await db.close();
  }
});
