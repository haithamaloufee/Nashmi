import { test, expect } from "@playwright/test";
import { authenticate, protectedRoutes, fixtures } from "./helpers";
import { mkdirSync, writeFileSync } from "node:fs";

const roles = ["guest", "citizen", "party", "iec", "admin", "super_admin"];
for (const role of roles) {
  test(`baseline ${role}: route permissions, navigation and social controls`, async ({ page, context }, info) => {
    test.setTimeout(300_000);
    if (role !== "guest") await authenticate(context, role);
    const policy: any[] = [];
    for (const [owner, routes] of Object.entries(protectedRoutes)) for (const route of routes) {
      const response = await context.request.get(`http://127.0.0.1:3020${route}`, { maxRedirects: 0, timeout: 60_000 });
      const allowed = route === "/account" ? role !== "guest" : owner === "super_admin" ? ["admin", "super_admin"].includes(role) : role === owner;
      policy.push({ route, role, status: response.status(), location: response.headers().location, allowed });
      // App Router can deliver redirects inside a streamed HTTP 200 response.
      if (allowed) expect(response.status(), `${role} ${route}`).toBe(200);
      else if (response.status() === 307) expect(new URL(response.headers().location, "http://127.0.0.1:3020").pathname).toBe("/login");
      else expect(await response.text(), `${role} ${route} streamed redirect`).toMatch(/NEXT_REDIRECT[^<]*\/login/);
    }
    mkdirSync("test-results/baseline", { recursive: true });
    writeFileSync(`test-results/baseline/permissions-${role}.json`, JSON.stringify(policy, null, 2));
    await info.attach("role-policy", { body: JSON.stringify(policy), contentType: "application/json" });
    await page.goto("/updates");
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    const card = page.locator("article").first();
    await card.getByRole("button", { name: "عرض المزيد", exact: true }).click();
    await expect(card.getByRole("button", { name: "عرض أقل", exact: true })).toBeVisible();
    await card.getByRole("button", { name: "عرض أقل", exact: true }).click();
    const like = card.getByRole("button", { name: "إعجاب", exact: true });
    const reactionRequest = page.waitForResponse(response => response.url().endsWith("/reaction") && response.request().method() === "PUT");
    await like.click();
    expect((await reactionRequest).status()).toBe(role === "guest" ? 401 : role === "citizen" ? 200 : 403);
    if (role === "guest") {
      await expect(page.getByRole("heading", { name: "تسجيل الدخول مطلوب" })).toBeVisible();
      await page.getByRole("button", { name: "إغلاق", exact: true }).click();
    } else if (role === "citizen") {
      const undo = page.waitForResponse(response => response.url().endsWith("/reaction") && response.request().method() === "DELETE");
      await like.click(); expect((await undo).status()).toBe(200);
    }
    await card.getByRole("button", { name: "تعليق", exact: true }).click();
    const comments = card.getByRole("textbox", { name: "كتابة تعليق", exact: true });
    await expect(comments).toBeVisible();
    await comments.fill(`مسودة اختبار ${role}`);
    await card.getByRole("button", { name: "عرض المزيد من التعليقات", exact: true }).click();
    await expect(card.getByText("تعليق محلي تجريبي 5", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "مشاركة", exact: true }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "مشاركة عبر واتساب" })).toHaveAttribute("rel", /noopener/);
    await page.getByRole("menuitem", { name: "نسخ الرابط", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "تم نسخ الرابط" })).toBeVisible();
    await page.keyboard.press("Escape");
    await card.getByRole("button", { name: "إرسال بلاغ", exact: true }).first().click();
    const report = page.getByRole("dialog");
    await expect(report).toBeVisible();
    await report.locator("select").selectOption("hate");
    await report.locator("textarea").fill("مسودة بلاغ محلي، دون إرسال");
    await page.goto("/parties/qa-civic");
    const follow = page.getByRole("button", { name: "متابعة", exact: true });
    const followRequest = page.waitForResponse(response => response.url().endsWith("/follow") && response.request().method() === "POST");
    await follow.click();
    expect((await followRequest).status()).toBe(role === "guest" ? 401 : role === "citizen" ? 200 : 403);
    if (role === "guest") await page.getByRole("button", { name: "إغلاق", exact: true }).last().click();
    else if (role === "citizen") {
      const undo = page.waitForResponse(response => response.url().endsWith("/follow") && response.request().method() === "DELETE");
      await page.getByRole("button", { name: "إلغاء المتابعة", exact: true }).click();
      expect((await undo).status()).toBe(200);
    }
    // Expand every profile information accordion and exercise the jump-to-feed.
    const accordions = page.locator('main button[aria-controls][aria-expanded]');
    for (let i = 0; i < await accordions.count(); i++) { const button = accordions.nth(i); const before = await button.getAttribute("aria-expanded"); await button.click(); await expect(button).toHaveAttribute("aria-expanded", before === "true" ? "false" : "true"); }
    await page.getByRole("link", { name: "آخر التحديثات", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('button[aria-controls="mobile-navigation"]').click();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-navigation")).toHaveCount(0);
    await page.screenshot({ path: `test-results/baseline/interactions-${role}-mobile.png` });
  });
}

test("baseline public filters, authentication validation, recovery links and display settings", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/updates");
  for (const name of ["منشورات", "تصويتات", "استبيانات", "الكل"]) {
    const button = page.getByRole("button", { name, exact: true }); await button.click(); await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "بحث متقدم", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="date"]').first().fill("2026-09-01");
  await dialog.locator('input[type="date"]').last().fill("2026-10-01");
  await dialog.locator("select").selectOption("iec");
  await dialog.locator('input[placeholder="#Youth"]').fill("مشاركة");
  await dialog.getByRole("button", { name: "إعادة الضبط", exact: true }).click();
  await expect(dialog.locator('input[type="date"]').first()).toHaveValue("");
  await dialog.getByRole("button", { name: "تطبيق البحث", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const sort = page.locator("main select").first(); for (const value of ["oldest", "mostCommented", "mostLiked", "pollsEndingSoon", "newest"]) { await sort.selectOption(value); await expect(sort).toHaveValue(value); }
  await page.goto("/laws");
  await page.locator('input[name="search"]').fill("تجريبية");
  await page.locator('select[name="category"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await expect(page).toHaveURL(/search=/);
  await page.goto("/signup");
  await page.getByRole("button", { name: "إنشاء الحساب", exact: true }).click();
  await expect(page.locator('input[name="email"]')).toHaveAttribute("aria-invalid", "true");
  await page.locator('input[name="name"]').fill("اختبار محلي");
  await page.locator('input[name="email"]').fill("forms@nashmi.test");
  await page.locator('input[name="password"]').fill(fixtures().password);
  await page.locator('input[name="confirmPassword"]').fill("Mismatch-2026!Only");
  await expect(page.getByText("كلمتا المرور غير متطابقتين.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");
  for (const route of ["/reset-password?token=qa-invalid", "/set-password?token=qa-invalid"]) {
    await page.goto(route);
    await page.locator('[name="password"]').fill(fixtures().password);
    await page.locator('[name="confirmation"]').fill("Mismatch-2026!Only");
    await page.getByRole("button", { name: "حفظ كلمة المرور" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("غير متطابقتين");
  }
  await page.goto("/updates");
  await page.getByRole("button", { name: "إعدادات العرض واللغة", exact: true }).click();
  await page.getByRole("button", { name: "تفعيل الوضع الداكن" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator("#navbar-utility-menu").getByRole("button", { name: /English|اللغة|language/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

for (const role of ["party", "iec", "admin", "super_admin"]) test(`baseline ${role}: publisher/dashboard forms, modals and management controls`, async ({ page, context }) => {
  test.setTimeout(300_000);
  await authenticate(context, role);
  const dashboard = role === "party" ? "/party-dashboard" : role === "iec" ? "/iec-dashboard" : "/admin";
  const visited = protectedRoutes[role === "admin" ? "super_admin" : role];
  const interactions: any[] = [];
  // Exercise form controls against a synthetic failure response. Actual core mutations are tested separately.
  await page.route("**/api/**", async route => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(route.request().method())) return route.fulfill({ status: 503, json: { ok: false, error: { message: "Synthetic baseline failure" } } });
    return route.continue();
  });
  page.on("dialog", dialog => void dialog.dismiss());
  for (const route of visited) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
    const controls = page.locator('main input:not([type="hidden"]):not([type="file"]),main textarea,main select');
    for (let i = 0; i < await controls.count(); i++) {
      const control = controls.nth(i);
      if (!await control.isVisible() || !await control.isEnabled() || await control.getAttribute("readonly") !== null) continue;
      const data = await control.evaluate((element: any) => ({ tag: element.tagName, type: element.type, name: element.name || element.getAttribute("placeholder"), options: element.options ? [...element.options].map((o: any) => o.value) : undefined }));
      if (data.tag === "SELECT") { for (const value of data.options!) await control.selectOption(value); }
      else if (["checkbox", "radio"].includes(data.type)) await control.check();
      else if (!["datetime-local", "date", "number", "password"].includes(data.type)) await control.fill(data.type === "email" ? "ui-only@nashmi.test" : data.type === "url" ? "https://example.test" : "اختبار واجهة محلي");
      interactions.push({ route, control: data, status: "exercised" });
    }
    const forms = page.locator("main form");
    for (let i = 0; i < await forms.count(); i++) {
      const button = forms.nth(i).locator('button[type="submit"],button:not([type])').first();
      if (await button.count() && await button.isVisible() && await button.isEnabled()) { await button.click(); interactions.push({ route, submit: true, status: "validation-or-synthetic-failure" }); }
    }
    if (route.endsWith("/surveys")) {
      const add = page.getByRole("button", { name: "سؤال", exact: true });
      if (await add.count()) { await add.click(); await page.getByRole("button", { name: "خفض السؤال" }).first().click(); await page.getByRole("button", { name: "رفع السؤال" }).last().click(); await page.getByRole("button", { name: "إضافة خيار", exact: true }).first().click(); }
    }
    if (route === "/admin/moderation") {
      const trigger = page.getByRole("button", { name: /إشراف|إجراءات/ }).first();
      if (await trigger.count()) { await trigger.click(); await page.getByRole("menu").first().getByRole("menuitem", { name: "إخفاء", exact: true }).click(); await page.keyboard.press("Escape"); }
    }
  }
  await page.goto("/updates");
  const publish = page.getByRole("button", { name: "نشر جديد", exact: true });
  await expect(publish).toBeVisible();
  for (const name of ["إنشاء منشور", "إنشاء استطلاع رأي", "إنشاء استبيان"]) {
    await publish.click();
    await page.getByRole("dialog").getByRole("button", { name: new RegExp(name) }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    const input = modal.locator("textarea,input:not([type=file]):not([type=hidden])").first();
    if (await input.count()) await input.fill("مسودة محلية لا تُنشر");
    await modal.getByRole("button", { name: "إغلاق", exact: true }).click();
    await modal.getByRole("button", { name: "تجاهل التغييرات", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  mkdirSync("test-results/baseline", { recursive: true });
  writeFileSync(`test-results/baseline/form-interactions-${role}.json`, JSON.stringify({ dashboard, interactions }, null, 2));
});
