import { test, expect } from "@playwright/test";
import mongoose from "mongoose";
import AxeBuilder from "@axe-core/playwright";
import { authenticate } from "./helpers";
import { localDatabase } from "./local-db";

let logId: mongoose.Types.ObjectId | undefined;
test.beforeAll(async () => {
  const db = await localDatabase();
  try {
    const actor = await db.collection("users").findOne({ emailNormalized: "super_admin@nashmi.test" });
    logId = new mongoose.Types.ObjectId();
    await db.collection("auditlogs").insertOne({ _id: logId, actorUserId: actor!._id, actorRole: "super_admin", action: "law.create", targetType: "law", metadata: { slug: "ux-theme-fixture", title: "سجل اصطناعي لفحص التباين" }, createdAt: new Date() });
  } finally { await db.close(); }
});
test.afterAll(async () => { const db = await localDatabase(); try { if (logId) await db.collection("auditlogs").deleteOne({ _id: logId }); } finally { await db.close(); } });

for (const language of ["ar", "en"]) for (const theme of ["light", "dark"]) for (const width of [390, 1440]) test(`recovery, survey archive and populated audit contrast ${language} ${theme} ${width}`, async ({ page, context }, info) => {
  const states: any[] = [];
  await context.addCookies([{ name: "nashmi-language", value: language, url: "http://127.0.0.1:3020" }]);
  await page.addInitScript(({ language, theme }) => { localStorage.setItem("nashmi-language", language); localStorage.setItem("nashmi-theme", theme); }, { language, theme });
  await page.setViewportSize({ width, height: 900 });
  for (const path of ["/reset-password", "/set-password", "/party-dashboard/surveys", "/admin/surveys", "/admin/logs", "/admin/audit-logs"]) {
    if (path.startsWith("/party")) await authenticate(context, "party");
    else if (path.startsWith("/admin")) await authenticate(context, "super_admin");
    await page.goto(path);
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
    if (path.includes("password")) await expect(page.locator("p.text-red-700")).toBeVisible();
    else if (path.includes("surveys")) await page.locator("main article").first().getByRole("button", { name: "أرشفة", exact: true }).scrollIntoViewIfNeeded();
    else await page.getByText("ux-theme-fixture", { exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    states.push({ path, violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  await info.attach("display-state-axe", { body: JSON.stringify(states, null, 2), contentType: "application/json" });
  expect(states.filter(state => state.violations.length)).toEqual([]);
});
