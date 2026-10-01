import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import mongoose from "mongoose";
import { authenticate } from "./helpers";
import { localDatabase } from "./local-db";

test("all five survey question types persist one response and expose accessible controls", async ({ page, context }, info) => {
  await authenticate(context, "citizen");
  const db = await localDatabase();
  const template = await db.collection("surveys").findOne({ slug: "qa-survey" });
  const slug = `qa-all-types-${info.project.name}-${Date.now()}`;
  const questions = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO", "RATING", "TEXT"].map((type, order) => ({ _id: new mongoose.Types.ObjectId(), title: `سؤال تجريبي ${type}`, type, required: true, order, options: ["خيار أول", "خيار ثان"].map((label, order) => ({ _id: new mongoose.Types.ObjectId(), label, order })) }));
  const record = { ...template, _id: new mongoose.Types.ObjectId(), slug, title: "استبيان جميع الأنواع للاختبار", questions, status: "published", totalResponses: 0, resultsVisibility: "AFTER_SUBMIT" };
  await db.collection("surveys").insertOne(record);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/surveys/${slug}`);
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    await page.getByRole("button", { name: "إرسال المشاركة", exact: true }).click();
    await expect(page.getByText("يرجى الإجابة عن جميع الأسئلة المطلوبة.", { exact: true })).toBeVisible();
    const fields = page.locator("fieldset");
    await fields.nth(0).getByRole("radio").first().check();
    await fields.nth(1).getByRole("checkbox").nth(0).check();
    await fields.nth(1).getByRole("checkbox").nth(1).check();
    await fields.nth(2).getByRole("radio").first().check();
    await fields.nth(3).getByRole("button", { name: "4", exact: true }).click();
    await expect(fields.nth(3).getByRole("button", { name: "4", exact: true })).toHaveAttribute("aria-pressed", "true");
    await fields.nth(4).getByRole("textbox", { name: "سؤال تجريبي TEXT", exact: true }).fill("إجابة نصية محلية لاختبار الحفظ");
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) }))).toEqual([]);
    const response = page.waitForResponse(response => response.url().endsWith("/responses") && response.request().method() === "POST");
    await page.getByRole("button", { name: "إرسال المشاركة", exact: true }).click();
    expect((await response).ok()).toBe(true);
    await expect(page.getByText("لقد شاركت سابقًا في هذا الاستبيان.", { exact: true })).toBeVisible();
    const saved = await db.collection("surveyresponses").findOne({ surveyId: record._id });
    expect(saved?.answers).toHaveLength(5);
    expect(saved?.answers.find((answer: any) => answer.questionId.equals(questions[1]._id)).optionIds).toHaveLength(2);
    expect(saved?.answers.find((answer: any) => answer.questionId.equals(questions[3]._id)).valueNumber).toBe(4);
    expect(saved?.answers.find((answer: any) => answer.questionId.equals(questions[4]._id)).valueText).toBe("إجابة نصية محلية لاختبار الحفظ");
    await page.reload();
    await expect(page.getByText("لقد شاركت سابقًا في هذا الاستبيان.", { exact: true })).toBeVisible();
  } finally { await db.collection("surveyresponses").deleteMany({ surveyId: record._id }); await db.collection("surveys").deleteOne({ _id: record._id }); await db.close(); }
});
