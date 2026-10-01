import { test, expect } from "@playwright/test";
import mongoose from "mongoose";
import AxeBuilder from "@axe-core/playwright";
import { authenticate, fixtures } from "./helpers";
import { localDatabase } from "./local-db";

for (const role of ["iec", "admin", "super_admin"]) test(`local ${role} law create, edit and persistence through dialogs`, async ({ page, context }) => {
  await authenticate(context, role);
  const db = await localDatabase();
  const slug = `ux-law-${role.replaceAll("_", "-")}-${Date.now()}`;
  try {
    await page.goto("/laws");
    await page.getByRole("button", { name: "إضافة قانون", exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (const [name, value] of Object.entries({ title: "مادة اصطناعية لاختبار الحفظ", slug, category: "الأحزاب", sourceName: "مصدر اختبار محلي", sourceType: "official", shortDescription: "بيانات اصطناعية لاختبار واجهة إدارة القوانين", simplifiedExplanation: "شرح اصطناعي يستخدم لاختبار حفظ الحقول في قاعدة البيانات المحلية فقط." })) await dialog.locator(`[name="${name}"]`).fill(value);
    const created = page.waitForResponse(r => r.url().endsWith("/api/admin/laws") && r.request().method() === "POST");
    await dialog.locator('button[type="submit"]').click();
    expect((await created).status()).toBe(201);
    await expect(dialog).toHaveCount(0);
    const law = await db.collection("laws").findOne({ slug });
    expect(law?.title).toBe("مادة اصطناعية لاختبار الحفظ");
    await page.goto(`/laws/${slug}`);
    await page.getByRole("button", { name: "تعديل القانون", exact: true }).click();
    await dialog.locator('[name="title"]').fill("مادة اصطناعية بعد التعديل");
    await dialog.locator('[name="changeReason"]').fill("تحقق محلي من حفظ التعديل");
    const edited = page.waitForResponse(r => r.url().endsWith(`/api/admin/laws/${law!._id}`) && r.request().method() === "PATCH");
    await dialog.locator('button[type="submit"]').click();
    expect((await edited).status()).toBe(200);
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "مادة اصطناعية بعد التعديل", exact: true })).toBeVisible();
    expect((await db.collection("laws").findOne({ slug }))?.title).toBe("مادة اصطناعية بعد التعديل");
  } finally { await db.collection("laws").deleteMany({ slug }); await db.close(); }
});

for (const role of ["party", "iec", "admin", "super_admin"]) test(`local ${role} survey builder create, edit, publish, close and archive`, async ({ page, context }) => {
  await authenticate(context, role);
  const db = await localDatabase();
  const marker = `UX-survey-${role}-${Date.now()}`;
  const path = role === "party" ? "/party-dashboard/surveys" : role === "iec" ? "/iec-dashboard/surveys" : "/admin/surveys";
  try {
    await page.goto(path);
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    await page.getByPlaceholder("عنوان الاستبيان", { exact: true }).fill(marker);
    await page.getByPlaceholder("نص السؤال", { exact: true }).fill("سؤال اصطناعي للحفظ");
    await page.getByRole("combobox", { name: "نوع السؤال 1", exact: true }).selectOption("TEXT");
    const creation = page.waitForResponse(r => r.url().endsWith("/api/surveys") && r.request().method() === "POST");
    await page.getByRole("button", { name: "حفظ الاستبيان", exact: true }).click();
    expect((await creation).status()).toBe(201);
    const saved = await db.collection("surveys").findOne({ title: marker });
    expect(saved?.questions[0].type).toBe("TEXT");
    const card = page.locator("main article").filter({ hasText: marker });
    await card.getByRole("button", { name: "تعديل", exact: true }).click();
    await page.getByPlaceholder("وصف قصير", { exact: true }).fill("وصف محلي بعد التعديل");
    const edit = page.waitForResponse(r => r.url().endsWith(`/api/surveys/${saved!._id}`) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: "حفظ الاستبيان", exact: true }).click();
    expect((await edit).status()).toBe(200);
    for (const [label, status] of [["نشر", "published"], ["إغلاق", "closed"]]) {
      const action = page.waitForResponse(r => r.url().endsWith(`/api/surveys/${saved!._id}`) && r.request().method() === "PATCH");
      await card.getByRole("button", { name: label, exact: true }).click();
      expect((await action).status()).toBe(200);
      expect((await db.collection("surveys").findOne({ _id: saved!._id }))?.status).toBe(status);
      await expect(card.getByRole("button", { name: status === "published" ? "إغلاق" : "نشر", exact: true })).toBeVisible();
    }
    page.once("dialog", dialog => void dialog.dismiss());
    await card.getByRole("button", { name: "أرشفة", exact: true }).click();
    expect((await db.collection("surveys").findOne({ _id: saved!._id }))?.status).toBe("closed");
    page.once("dialog", dialog => void dialog.accept());
    const archive = page.waitForResponse(r => r.url().endsWith(`/api/surveys/${saved!._id}`) && r.request().method() === "DELETE");
    await card.getByRole("button", { name: "أرشفة", exact: true }).click();
    expect((await archive).status()).toBe(200);
    await expect.poll(async () => (await db.collection("surveys").findOne({ _id: saved!._id }))?.status).toBe("archived");
  } finally { await db.collection("surveys").deleteMany({ title: marker }); await db.close(); }
});

for (const role of ["admin", "super_admin"]) test(`local ${role} report actions persist and retain auditable outcomes`, async ({ page, context }) => {
  await authenticate(context, role);
  const db = await localDatabase();
  const template = await db.collection("posts").findOne({ _id: new mongoose.Types.ObjectId(fixtures().postId) });
  const postId = new mongoose.Types.ObjectId();
  const reports: mongoose.Types.ObjectId[] = [];
  const actor = await db.collection("users").findOne({ emailNormalized: "citizen@nashmi.test" });
  const marker = `UX-moderation-${role}-${Date.now()}`;
  try {
    await db.collection("posts").insertOne({ ...template!, _id: postId, title: marker });
    for (const [action, status] of [["hide", "hidden"], ["delete", "deleted"], ["restore", "published"], ["dismiss_report", "published"]]) {
      const id = new mongoose.Types.ObjectId(); reports.push(id);
      await db.collection("reports").insertOne({ _id: id, targetType: "post", targetId: postId, reporterUserId: actor!._id, reason: "other", details: `${marker}-${action}`, status: "open", createdAt: new Date(), updatedAt: new Date() });
      await page.goto("/admin/reports");
      const row = page.locator('main div.rounded.border.p-4').filter({ hasText: `${marker}-${action}` });
      const form = row.locator("form");
      await form.locator('[name="action"]').selectOption(action);
      await form.locator('[name="reason"]').fill("سبب اصطناعي محلي للاختبار");
      const applied = page.waitForResponse(r => r.url().endsWith(`/api/admin/reports/${id}`) && r.request().method() === "PATCH");
      await form.getByRole("button", { name: "تنفيذ", exact: true }).click();
      expect((await applied).status()).toBe(200);
      expect((await db.collection("posts").findOne({ _id: postId }))?.status).toBe(status);
      expect((await db.collection("reports").findOne({ _id: id }))?.status).toBe(action === "dismiss_report" ? "dismissed" : "action_taken");
      expect(await db.collection("moderationactions").countDocuments({ targetId: postId, action })).toBe(1);
    }
  } finally { await db.collection("reports").deleteMany({ _id: { $in: reports } }); await db.collection("posts").deleteOne({ _id: postId }); await db.collection("moderationactions").deleteMany({ targetId: postId }); await db.close(); }
});

for (const role of ["admin", "super_admin"]) test(`local ${role} news hide and show persist; populated ticker is accessible`, async ({ page, context }, info) => {
  await authenticate(context, role);
  const db = await localDatabase();
  const id = new mongoose.Types.ObjectId();
  const batchId = `ux-news-${role}-${Date.now()}`;
  const previous = await db.collection("newsrefreshstates").findOne({ _id: "global" as any });
  const marker = "عنوان اصطناعي للتحقق من إدارة الأخبار";
  try {
    await db.collection("newsrefreshstates").updateOne({ _id: "global" as any }, { $set: { currentBatchId: batchId } }, { upsert: true });
    await db.collection("newsitems").insertOne({ _id: id, titleAr: marker, summaryAr: "خبر اصطناعي محلي للتحقق من العرض وإخفاء الخبر وإظهاره فقط.", category: "parliament", urgency: "normal", publishedAt: new Date(), expiresAt: new Date(Date.now() + 3600000), canonicalHash: batchId, sources: [{ title: "مصدر اختبار", url: "https://example.test/news", publisher: "مصدر اصطناعي", sourceClass: "official" }], batchId, status: "published", isActive: true, discoveryRunId: batchId, createdAt: new Date(), updatedAt: new Date() });
    await page.goto("/admin/news");
    const card = page.locator("main article").filter({ hasText: marker });
    for (const [label, status] of [["إخفاء", "hidden"], ["إظهار", "published"]]) {
      const changed = page.waitForResponse(r => r.url().endsWith(`/api/admin/news/${id}`) && r.request().method() === "PATCH");
      await card.getByRole("button", { name: label, exact: true }).click();
      expect((await changed).status()).toBe(200);
      expect((await db.collection("newsitems").findOne({ _id: id }))?.status).toBe(status);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const ticker = page.getByRole("region", { name: "آخر الأخبار" });
    await expect(ticker).toBeVisible();
    await expect(ticker.locator('[data-original="true"]').first()).toHaveAttribute("href", `/chat?news=${id}&fresh=1#chat-composer`);
    const violations = (await new AxeBuilder({ page }).include(".news-ticker-shell").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
    expect(violations).toEqual([]);
    await page.screenshot({ path: `test-results/final/news-${role}-mobile.png` });
    await info.attach("news-mobile", { path: `test-results/final/news-${role}-mobile.png`, contentType: "image/png" });
    const gap = await page.evaluate(() => document.querySelector(".news-ticker-home")!.getBoundingClientRect().top - document.querySelector("header")!.getBoundingClientRect().bottom);
    expect(gap, "Ticker meets the sticky navigation without a floating gap").toBeLessThanOrEqual(1);
  } finally { await db.collection("newsitems").deleteOne({ _id: id }); if (previous) await db.collection("newsrefreshstates").replaceOne({ _id: "global" as any }, previous); else await db.collection("newsrefreshstates").deleteOne({ _id: "global" as any }); await db.close(); }
});
