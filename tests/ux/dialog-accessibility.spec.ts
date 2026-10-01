import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authenticate } from "./helpers";

for (const theme of ["light", "dark"]) test(`mobile dialogs and menus WCAG and focus ${theme}`, async ({ page, context }) => {
  await page.addInitScript(theme => localStorage.setItem("nashmi-theme", theme), theme);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  const audit = async () => {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) }))).toEqual([]);
  };
  const search = page.getByRole("button", { name: "بحث متقدم", exact: true });
  await search.click();
  await expect(page.getByRole("dialog")).toBeFocused();
  await audit();
  await page.keyboard.press("Escape");
  await expect(search).toBeFocused();
  const report = page.locator("article").first().getByRole("button", { name: "إرسال بلاغ", exact: true });
  await report.click();
  await expect(page.getByRole("dialog")).toBeFocused();
  await audit();
  await page.keyboard.press("Escape");
  await expect(report).toBeFocused();
  const share = page.locator("article").first().getByRole("button", { name: "مشاركة", exact: true });
  await share.click();
  await audit();
  await page.keyboard.press("Escape");
  await authenticate(context, "iec");
  await page.goto("/laws");
  const create = page.getByRole("button", { name: "إضافة قانون", exact: true });
  await create.click();
  await expect(page.getByRole("dialog")).toBeFocused();
  await audit();
  await page.keyboard.press("Escape");
  await expect(create).toBeFocused();
});
