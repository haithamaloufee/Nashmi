import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

test("navigation distinguishes landing logo and social Home, including mobile", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  const nav = page.locator('nav[aria-label="التنقل الرئيسي"]');
  await expect(nav.getByRole("link", { name: "الرئيسية", exact: true })).toHaveAttribute("href", "/updates");
  await expect(nav.getByRole("link", { name: "الرئيسية", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Nashmi home" }).click();
  await expect(page).toHaveURL(/:3020\/$/);
  await nav.getByRole("link", { name: "الرئيسية", exact: true }).click();
  await expect(page).toHaveURL(/\/updates$/);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(nav.getByRole("link", { name: "الرئيسية", exact: true })).toBeVisible();
  const bounds = await nav.getByRole("link", { name: "الرئيسية", exact: true }).boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  const toggle = page.locator('button[aria-controls="mobile-navigation"]');
  await toggle.click();
  await expect(page.locator("#mobile-navigation").getByRole("link", { name: "الرئيسية", exact: true })).toHaveAttribute("href", "/updates");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
});

test("feed automatically paginates without duplicate cards and restores loaded pages on Back", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  await expect(page.locator("[data-feed-item]")).toHaveCount(10);
  await page.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("[data-feed-item]").count()).toBeGreaterThan(10);
  const ids = await page.locator("[data-feed-item]").evaluateAll(items => items.map(el => el.getAttribute("data-feed-item")));
  expect(new Set(ids).size).toBe(ids.length);
  await page.locator("[data-feed-item]").nth(12).scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  const count = await page.locator("[data-feed-item]").count();
  const link = page.locator('aside a[href="/parties"]').first();
  // A fixed sidebar link avoids changing the reading position before navigation.
  await link.click();
  await expect(page).toHaveURL(/\/parties$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/updates$/);
  await expect.poll(() => page.locator("[data-feed-item]").count()).toBeGreaterThanOrEqual(count);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 100);
});

test("rapid search changes cannot replace fresh results with a slower old response", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  const makePost = (name: string) => ({ type: "post", publishedAt: "2026-10-01T00:00:00Z", item: { _id: name, title: name, content: name, authorType: "admin", likesCount: 0, dislikesCount: 0, commentsCount: 0 } });
  await page.route("**/api/updates?**", async route => {
    const search = new URL(route.request().url()).searchParams.get("search");
    if (!search) return route.continue();
    await new Promise(resolve => setTimeout(resolve, search === "old-query" ? 1500 : 50));
    await route.fulfill({ json: { ok: true, data: { updates: [makePost(search)], totalCount: 1 }, nextCursor: null } }).catch(() => {});
  });
  const search = page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true });
  const oldRequest = page.waitForRequest(request => request.url().includes("search=old-query"));
  await search.fill("old-query");
  await oldRequest;
  await search.fill("fresh-query");
  await expect(page.getByRole("heading", { name: "fresh-query", exact: true })).toBeVisible();
  await page.waitForTimeout(1600); // Deliberately exceed the old response delay to prove it cannot commit.
  await expect(page.getByRole("heading", { name: "fresh-query", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "old-query", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "الكل", exact: true }).click();
  await search.clear();
  await expect(page.locator("[data-feed-item]")).toHaveCount(10);
});

test("feed failure exposes retry and delayed responses expose loading state", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  let fail = true;
  await page.route("**/api/updates?**", async route => {
    if (!new URL(route.request().url()).searchParams.has("search")) return route.continue();
    await new Promise(resolve => setTimeout(resolve, 800));
    if (fail) return route.fulfill({ status: 503, json: { ok: false, error: { message: "Synthetic outage" } } });
    return route.fulfill({ json: { ok: true, data: { updates: [], totalCount: 0 }, nextCursor: null } });
  });
  await page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true }).fill("retry-query");
  await expect(page.locator('[data-feed-region][aria-busy="true"]')).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Synthetic outage" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "حاول مرة أخرى", exact: true }).click();
  await expect(page.getByText("لا توجد مستجدات مطابقة", { exact: true })).toBeVisible();
});

test("comments preserve drafts on failure and support local posting, reactions and report dialogs", async ({ page, context }, info) => {
  await authenticate(context, "citizen");
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  const card = page.locator("article").first();
  await card.getByRole("button", { name: "تعليق", exact: true }).click();
  const composer = card.getByRole("textbox", { name: "كتابة تعليق", exact: true });
  await expect(composer).toBeVisible();
  await expect(card.locator("[data-comment]").first()).toBeVisible();
  // Equal-time comment pagination is a separate recorded failing regression awaiting approval.
  await page.route("**/api/posts/*/comments", async route => route.request().method() === "POST" ? route.fulfill({ status: 503, json: { ok: false, error: { message: "Synthetic comment failure" } } }) : route.continue());
  const draft = `تعليق محلي آمن ${info.project.name} ${Date.now()}`;
  await composer.fill(draft);
  await composer.press("Enter");
  await expect(card.getByRole("alert")).toContainText("Synthetic comment failure");
  await expect(composer).toHaveValue(draft);
  await page.unroute("**/api/posts/*/comments");
  await composer.press("Enter");
  await expect(card.getByText(draft, { exact: true })).toBeVisible();
  await expect(composer).toHaveValue("");
  await card.getByRole("button", { name: "إعجاب", exact: true }).click();
  await expect(card.getByRole("button", { name: "إعجاب", exact: true })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "إرسال بلاغ", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").selectOption("other");
  await dialog.getByRole("textbox").fill("بيانات بلاغ اصطناعية محلية");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("search dialog traps focus and returns it; share menu is keyboard accessible", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("textbox", { name: "ابحث في المستجدات...", exact: true })).toBeEnabled();
  const trigger = page.getByRole("button", { name: "بحث متقدم", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("button").last().focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const share = page.locator("article").first().getByRole("button", { name: "مشاركة", exact: true });
  await share.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  expect(await page.getByRole("menu").evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(share).toBeFocused();
});

test("login accepts existing passwords and enters social Home with real local auth", async ({ page }) => {
  await page.goto("/login");
  // Navbar and AuthForm hydrate independently. A real password-toggle state
  // change proves this form is interactive before entering the synthetic data.
  const form = page.locator("main form");
  await form.getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await expect(form.locator('input[name="password"]')).toHaveAttribute("type", "text");
  await page.locator('input[name="email"]').fill("legacy@nashmi.test");
  await page.locator('input[name="password"]').fill("legacy-pass");
  await expect(form.locator('input[name="email"]')).toHaveValue("legacy@nashmi.test");
  await expect(form.locator('input[name="password"]')).toHaveValue("legacy-pass");
  await expect(page.getByRole("button", { name: "دخول", exact: true }).last()).toBeEnabled();
  // A synthetic verified account has this pre-existing password; submit it through the real API.
  const response = page.waitForResponse(response => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "دخول", exact: true }).last().click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/updates$/);
});

