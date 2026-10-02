import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";
import { localDatabase } from "./local-db";

test("party profile network failure retains text drafts and enables retry", async ({ page, context }) => {
  await authenticate(context, "party");
  await page.route("**/api/party/profile", route => route.abort("connectionfailed"));
  await page.goto("/party-dashboard/profile");
  const draft = "مسودة اصطناعية تبقى بعد انقطاع الشبكة";
  const input = page.locator('[name="shortDescription"]');
  await input.fill(draft);
  const save = page.locator("main form").getByRole("button", { name: "حفظ التغييرات", exact: true });
  await save.click();
  await expect(page.getByText("تعذر الاتصال بالخادم", { exact: true })).toBeVisible();
  await expect(input).toHaveValue(draft);
  await expect(save).toBeEnabled();
});

test("party profile text edits persist in the public profile and after reload", async ({ page, context }) => {
  await authenticate(context, "party");
  const db = await localDatabase();
  const previous = await db.collection("parties").findOne({ slug: "qa-civic" });
  const description = `وصف اصطناعي محلي للتحقق من استمرار الملف ${Date.now()}`;
  try {
    await page.goto("/party-dashboard/profile");
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    await page.locator('[name="shortDescription"]').fill(description);
    await page.getByRole("textbox", { name: "الوصف الكامل", exact: true }).fill(description);
    const saved = page.waitForResponse(r => r.url().endsWith("/api/party/profile") && r.request().method() === "PATCH");
    await page.locator("main form").getByRole("button", { name: "حفظ التغييرات", exact: true }).click();
    expect((await saved).status()).toBe(200);
    expect((await db.collection("parties").findOne({ slug: "qa-civic" }))?.shortDescription).toBe(description);
    await expect(page.locator("main form").getByRole("button", { name: "حفظ التغييرات", exact: true })).toBeEnabled();
    await page.reload();
    await expect(page.locator('[name="shortDescription"]')).toHaveValue(description);
    await page.goto("/parties/qa-civic");
    await expect(page.getByText(description, { exact: true }).first()).toBeVisible();
  } finally { if (previous) await db.collection("parties").replaceOne({ _id: previous._id }, previous); await db.close(); }
});

for (const role of ["admin", "super_admin"]) test(`local ${role} creates a synthetic account and updates status and role`, async ({ page, context }) => {
  await authenticate(context, role);
  const db = await localDatabase();
  const email = `ux-created-${role}-${Date.now()}@nashmi.test`;
  const marker = `حساب اصطناعي ${role}`;
  try {
    await page.goto("/admin/users");
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    // The dismissible launcher can cover controls in a wide management table.
    // Exercise the user's X action before editing, rather than forcing a covered click.
    await page.getByRole("button", { name: "إخفاء المساعد حتى إعادة تحميل الصفحة", exact: true }).click();
    const create = page.locator("main form").filter({ has: page.locator('[name="email"]') });
    await create.locator('[name="name"]').fill(marker);
    await create.locator('[name="email"]').fill(email);
    const creation = page.waitForResponse(r => r.url().endsWith("/api/admin/users") && r.request().method() === "POST");
    await create.getByRole("button", { name: "إنشاء", exact: true }).click();
    expect((await creation).status()).toBe(201);
    await expect(create.getByRole("button", { name: "إنشاء", exact: true })).toBeEnabled();
    await expect(page.locator("main tbody tr").filter({ hasText: email })).toBeVisible();
    const user = await db.collection("users").findOne({ emailNormalized: email });
    expect(user?.passwordHash).toBeNull();
    expect(user?.status).toBe("pending");
    // Mail transport is intentionally unconfigured; no successful delivery claim.
    await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
    // A full document navigation intentionally restores the collapsed launcher.
    await page.getByRole("button", { name: "إخفاء المساعد حتى إعادة تحميل الصفحة", exact: true }).click();
    const row = page.locator("main tbody tr").filter({ hasText: email });
    for (const [field, value] of [["status", "disabled"], ["role", "party"]]) {
      const form = row.locator("form").filter({ has: page.locator(`[name="${field}"]`) });
      await form.locator("select").selectOption(value);
      const saved = page.waitForResponse(r => r.url().endsWith(`/api/admin/users/${user!._id}/${field}`) && r.request().method() === "PATCH");
      await form.getByRole("button", { name: "حفظ", exact: true }).click();
      expect((await saved).status()).toBe(200);
      await expect(form.getByRole("button", { name: "حفظ", exact: true })).toBeEnabled();
      await expect(row.locator("td").nth(field === "status" ? 3 : 2)).toHaveText(value);
      expect((await db.collection("users").findOne({ _id: user!._id }))?.[field]).toBe(value);
    }
    await page.reload();
    await expect(row.locator("td").nth(2)).toHaveText("party");
    await expect(row.locator("td").nth(3)).toHaveText("disabled");
  } finally { await db.collection("users").deleteMany({ emailNormalized: email }); await db.close(); }
});

test("local editorial content saves both languages and renders on the public About page", async ({ page, context }) => {
  await authenticate(context, "super_admin");
  const db = await localDatabase();
  const previous = await db.collection("sitecontents").findOne({ key: "about_nashmi" });
  const body = "نص اصطناعي محايد لاختبار الحفظ المحلي وإظهار النص العربي على الصفحة التعريفية.";
  try {
    await page.goto("/admin/about-nashmi");
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    await page.locator('[name="bodyAr"]').fill(body);
    await page.locator('[name="bodyEn"]').fill("Synthetic neutral local text used to verify editorial persistence and public rendering.");
    const saved = page.waitForResponse(r => r.url().endsWith("/api/admin/site-content/about-nashmi") && r.request().method() === "PUT");
    await page.locator("main form").locator('button[type="submit"], button:not([type])').last().click();
    expect((await saved).status()).toBe(200);
    expect((await db.collection("sitecontents").findOne({ key: "about_nashmi" }))?.bodyAr).toBe(body);
    await page.goto("/about-nashmi");
    await expect(page.getByText(body, { exact: true })).toBeVisible();
    expect((await db.collection("sitecontents").findOne({ key: "about_nashmi" }))?.bodyAr).toBe(body);
  } finally { if (previous) await db.collection("sitecontents").replaceOne({ _id: previous._id }, previous); else await db.collection("sitecontents").deleteOne({ key: "about_nashmi" }); await db.close(); }
});
