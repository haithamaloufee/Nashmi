import { test, expect } from "@playwright/test";
import { authenticate, fixtures } from "./helpers";

test("baseline citizen: actual comment, vote and survey persistence", async ({ page, context }) => {
  await authenticate(context, "citizen");
  await page.goto("/updates");
  const post = page.locator("article").first();
  await post.getByRole("button", { name: "تعليق", exact: true }).click();
  const draft = `تعليق QA ${Date.now()}`;
  await post.getByRole("textbox", { name: "كتابة تعليق", exact: true }).fill(draft);
  const saved = page.waitForResponse(r => r.url().includes("/comments") && r.request().method() === "POST");
  await post.getByRole("button", { name: "تعليق", exact: true }).last().click();
  expect((await saved).status()).toBe(201);
  await expect(post.getByText(draft, { exact: true })).toBeVisible();
  const poll = page.locator("article").filter({ has: page.getByRole("radio") }).first();
  await poll.getByRole("radio").first().check();
  const vote = page.waitForResponse(r => r.url().endsWith("/vote"));
  await poll.getByRole("button", { name: "تصويت", exact: true }).click();
  expect((await vote).status()).toBe(200);
  await expect(poll.getByRole("button", { name: "تم التصويت", exact: true })).toBeDisabled();
  await page.goto("/surveys/qa-survey");
  await page.getByRole("button", { name: "إرسال المشاركة", exact: true }).click();
  await expect(page.getByText("يرجى الإجابة عن جميع الأسئلة المطلوبة.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "4", exact: true }).click();
  const participation = page.waitForResponse(r => r.url().endsWith("/responses"));
  await page.getByRole("button", { name: "إرسال المشاركة", exact: true }).click();
  expect((await participation).ok()).toBe(true);
  await expect(page.getByText("لقد شاركت سابقًا في هذا الاستبيان.", { exact: true })).toBeVisible();
});

test("baseline citizen: actual profile persistence and file rejection with synthetic upload limits", async ({ page, context }) => {
  await authenticate(context, "citizen");
  await page.route("**/api/uploads", route => route.request().method() === "GET" ? route.fulfill({ json: { ok: true, data: { directR2Upload: true, maxImageSizeBytes: 10485760, maxVideoSizeBytes: 10485760, maxDocumentSizeBytes: 10485760 } } }) : route.continue());
  await page.goto("/account");
  await page.getByRole("textbox", { name: /^نبذة عني/ }).fill("نبذة محلية لاختبار الاستمرار");
  const profile = page.waitForResponse(r => r.url().endsWith("/api/users/me") && r.request().method() === "PATCH");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  expect((await profile).status()).toBe(200);
  await page.reload();
  await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
  await expect(page.getByRole("textbox", { name: /^نبذة عني/ })).toHaveValue("نبذة محلية لاختبار الاستمرار");
  await page.locator('input[type="file"]').setInputFiles({ name: "unsupported.exe", mimeType: "application/octet-stream", buffer: Buffer.from("QA") });
  await expect(page.getByText(/صيغة|نوع الملف|غير مدعوم/).last()).toBeVisible();
});

test("baseline recovery and verification response states use synthetic transport only", async ({ page }) => {
  await page.route("**/api/auth/**", route => route.fulfill({ status: 400, json: { ok: false, error: { message: "QA expired link" } } }));
  for (const path of ["/reset-password?token=qa-invalid", "/set-password?token=qa-invalid"]) {
    await page.goto(path);
    await page.locator('[name="password"]').fill(fixtures().password);
    await page.locator('[name="confirmation"]').fill(fixtures().password);
    await page.getByRole("button", { name: "حفظ كلمة المرور", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("QA expired link");
  }
  await page.goto("/verify-email?token=qa-invalid");
  await expect(page.getByText("QA expired link", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "طلب رابط جديد", exact: true })).toHaveAttribute("href", "/verify-email");
  await page.goto("/forgot-password");
  await page.locator('input[type="email"]').fill("qa@example.test");
  await page.locator("main form button").click();
  await expect(page.getByText("QA expired link", { exact: true })).toBeVisible();
});

test("baseline chat error and retry UI use an isolated synthetic provider", async ({ page }) => {
  await page.route("**/api/chat", route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { ok: false, error: { message: "QA assistant unavailable" } } }) : route.continue());
  await page.goto("/chat");
  await page.locator("main input").fill("سؤال اختبار محلي");
  await page.locator('main button[type="submit"]').click();
  await expect(page.getByText("QA assistant unavailable", { exact: true })).toBeVisible();
  const retry = page.getByRole("button", { name: /حاول مرة أخرى|إعادة المحاولة/ });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByText("QA assistant unavailable", { exact: true })).toBeVisible();
});
