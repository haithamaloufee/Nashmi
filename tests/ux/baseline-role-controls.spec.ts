import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

for (const role of ["guest", "citizen", "party", "iec", "admin", "super_admin"]) test(`baseline ${role}: comment, vote and report permissions through actual controls`, async ({ page, context }) => {
  if (role !== "guest") await authenticate(context, role);
  await page.goto("/updates");
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  const post = page.locator("article").first();
  await post.getByRole("button", { name: "تعليق", exact: true }).click();
  await post.getByRole("textbox", { name: "كتابة تعليق", exact: true }).fill(`Role QA ${role} ${Date.now()}`);
  const comment = page.waitForResponse(r => r.url().includes("/comments") && r.request().method() === "POST");
  await post.getByRole("button", { name: "تعليق", exact: true }).last().click();
  expect((await comment).status()).toBe(role === "guest" ? 401 : role === "citizen" ? 201 : 403);
  if (role === "guest") await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  const poll = page.locator("article").filter({ has: page.getByRole("radio") }).first();
  await poll.getByRole("radio").first().check();
  const vote = page.waitForResponse(r => r.url().endsWith("/vote"));
  await poll.getByRole("button", { name: "تصويت", exact: true }).click();
  const status = (await vote).status();
  if (role === "citizen") expect([200, 409]).toContain(status); // Repetition must never create a second vote.
  else expect(status).toBe(role === "guest" ? 401 : 403);
  if (role === "guest") await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  await post.getByRole("button", { name: "إرسال بلاغ", exact: true }).first().click();
  const form = page.getByRole('dialog').filter({ has: page.locator('select[name="reason"]') });
  await form.locator('select').selectOption("spam");
  await form.locator('textarea').fill("بلاغ على بيانات اصطناعية محلية فقط");
  const report = page.waitForResponse(r => r.url().endsWith("/api/reports") && r.request().method() === "POST");
  await form.getByRole("button", { name: "حفظ", exact: true }).click();
  expect((await report).status()).toBe(role === "guest" ? 401 : 201);
});
