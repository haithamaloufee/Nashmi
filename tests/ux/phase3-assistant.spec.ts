import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authenticate } from "./helpers";

const assistantName = "المساعد الذكي";
const messageName = "رسالة إلى المساعد الذكي";
const navSelector = 'nav[aria-label="التنقل الرئيسي"]';

async function simulateKeyboard(page: Page) {
  // VisualViewport simulation checks geometry, not Android's native keyboard UI.
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: innerHeight, width: innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    (window as any).__keyboard = (height: number, top = 0) => {
      Object.assign(viewport, { height, offsetTop: top });
      viewport.dispatchEvent(new Event("resize"));
    };
  });
}

test("mobile keyboard geometry keeps floating header and composer in visible viewport", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await simulateKeyboard(page);
  await page.goto("/updates");
  await expect(page.locator('[data-feed-region] input[aria-label]')).toBeEnabled();
  await page.getByRole("button", { name: assistantName, exact: true }).click();
  const panel = page.locator(`section[aria-label="${assistantName}"]`);
  await expect(panel).toBeVisible();
  await panel.getByRole("textbox", { name: messageName }).focus();
  await page.evaluate(() => (window as any).__keyboard(390, 30));
  await expect.poll(async () => {
    const header = await panel.locator("header").boundingBox();
    const composer = await panel.getByRole("textbox", { name: messageName }).boundingBox();
    return Boolean(header && composer && header.y >= 30 && composer.y + composer.height <= 420);
  }).toBe(true);
  await page.screenshot({ path: info.outputPath("floating-keyboard-simulation.png") });
  await page.evaluate(() => (window as any).__keyboard(844));
  await expect.poll(async () => (await panel.boundingBox())!.height).toBeGreaterThan(390);
});

test("mobile floating assistant blocks background scrolling and restores reading position", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/updates");
  await expect(page.locator('[data-feed-region] input[aria-label]')).toBeEnabled();
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  const previous = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: assistantName, exact: true }).click();
  const panel = page.locator(`section[aria-label="${assistantName}"]`);
  await expect(panel).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).position)).toBe("fixed");
  await panel.getByRole("log").hover();
  await page.mouse.wheel(0, 1300);
  await expect.poll(() => page.evaluate(() => document.body.style.top)).toBe(`-${previous}px`);
  await panel.getByRole("button", { name: "إغلاق المساعد", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(previous, 0);
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
});

test("dismissed launcher stays unmounted during navigation, full chat remains accessible, refresh restores launcher", async ({ page }) => {
  let chatRequests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/chat") chatRequests++; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/updates");
  await expect(page.locator('[data-feed-region] input[aria-label]')).toBeEnabled();
  expect(chatRequests).toBe(0);
  await page.getByRole("button", { name: "إخفاء المساعد حتى إعادة تحميل الصفحة", exact: true }).click();
  await expect(page.locator(".floating-assistant")).toHaveCount(0);
  await page.locator(navSelector).getByRole("link", { name: assistantName, exact: true }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.locator(".chat-workspace")).toBeVisible();
  await page.locator(navSelector).getByRole("link", { name: "الرئيسية", exact: true }).click();
  await expect(page).toHaveURL(/\/updates$/);
  await expect(page.locator(".floating-assistant")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: assistantName, exact: true })).toBeVisible();
  await expect(page.locator(".floating-assistant section")).toHaveCount(0);
});

for (const width of [390, 1440]) test(`full assistant history, messages, keyboard and accessibility ${width}`, async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await simulateKeyboard(page);
  const prompts: string[] = [];
  await page.route("**/api/chat", async route => {
    if (route.request().method() !== "POST") return route.continue();
    prompts.push(route.request().postDataJSON().message);
    await route.fulfill({ json: { ok: true, data: { message: { role: "assistant", content: "**جواب تجريبي**\n\n- معلومة محايدة" } } } });
  });
  await page.goto("/chat");
  const workspace = page.locator(".chat-workspace");
  const input = workspace.getByRole("textbox", { name: messageName });
  await expect(input).toBeEnabled();
  const toggle = workspace.getByRole("button", { name: "فتح وإغلاق سجل المحادثات", exact: true }).filter({ visible: true });
  const sidebar = page.locator("#chat-history");
  if (width < 1024) {
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveAttribute("aria-modal", "true");
    await page.keyboard.press("Escape");
    await expect(sidebar).toBeHidden();
    await expect(toggle).toBeFocused();
  } else {
    await expect(sidebar).toBeVisible();
    await toggle.click();
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await expect(sidebar).toBeVisible();
  }
  await input.fill("سطر أول");
  await input.press("Shift+Enter");
  await page.keyboard.insertText("س");
  expect(prompts).toHaveLength(0);
  await expect(input).toHaveValue("سطر أول\nس");
  await input.press("Enter");
  await expect(workspace.locator("strong")).toHaveText("جواب تجريبي");
  expect(prompts).toEqual(["سطر أول\nس"]);
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("autocomplete", "off");
  await expect(input).toHaveAttribute("enterkeyhint", "send");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  if (width < 640) {
    await page.evaluate(() => (window as any).__keyboard(410, 20));
    await expect.poll(async () => { const rect = await input.boundingBox(); return rect!.y + rect!.height; }).toBeLessThanOrEqual(430);
    // Geometry alone cannot detect the sticky Navbar covering the assistant header.
    await toggle.click();
    await expect(sidebar).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sidebar).toBeHidden();
    await workspace.getByRole("log").evaluate(element => { element.scrollTop = 0; });
    const latest = workspace.getByRole("button", { name: "الانتقال إلى آخر المحادثة", exact: true });
    await expect(latest).toBeVisible();
    await latest.click();
    await expect(workspace.locator(".chat-markdown").last()).toBeInViewport();
    await expect(latest).toBeHidden();
  }
  const logBounds = await workspace.getByRole("log").boundingBox();
  const composerBounds = await workspace.locator("#chat-composer").boundingBox();
  expect(logBounds!.y + logBounds!.height).toBeLessThanOrEqual(composerBounds!.y + 1);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath(`chat-${width}.png`) });
});

for (const role of ["citizen", "party", "iec", "admin", "super_admin"]) test(`saved history real local CRUD remains available for ${role}`, async ({ page, context }) => {
  await authenticate(context, role);
  const existing = await context.request.get("/api/chat/sessions");
  expect(existing.ok()).toBe(true);
  const previousIds = (await existing.json()).data.sessions.map((session: { _id: string }) => session._id) as string[];
  await page.goto("/chat");
  const conversation = page.locator('.chat-workspace > section');
  await expect(conversation.getByRole("textbox", { name: messageName })).toBeEnabled();
  const created = page.waitForResponse(r => r.url().endsWith("/api/chat/sessions") && r.request().method() === "POST");
  await conversation.getByRole("button", { name: "محادثة جديدة", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const id = (await response.json()).data.session._id;
  try {
  await expect(page.locator("#chat-history").getByRole("button", { name: "محادثة جديدة", exact: true })).toHaveCount(previousIds.length + 2);
  await page.reload();
  await expect(conversation.getByRole("button", { name: "حذف المحادثة", exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.dismiss());
  await conversation.getByRole("button", { name: "حذف المحادثة", exact: true }).click();
  const deleted = page.waitForResponse(r => r.url().endsWith(`/api/chat/sessions/${id}`) && r.request().method() === "DELETE");
  page.once("dialog", dialog => dialog.accept());
  await conversation.getByRole("button", { name: "حذف المحادثة", exact: true }).click();
  expect((await deleted).ok()).toBe(true);
  await expect(conversation.getByRole("button", { name: "حذف المحادثة", exact: true })).toHaveCount(previousIds.length ? 1 : 0);
  const remaining = await context.request.get("/api/chat/sessions");
  expect(remaining.ok()).toBe(true);
  const remainingIds = (await remaining.json()).data.sessions.map((session: { _id: string }) => session._id) as string[];
  expect(remainingIds).not.toContain(id);
  expect(remainingIds.sort()).toEqual(previousIds.sort());
  } finally {
    // Only this test's synthetic session is eligible for cleanup.
    await context.request.delete(`/api/chat/sessions/${id}`);
  }
});

test("root opens feed, logo opens welcome, four nav tabs animate with a single visible label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/updates$/);
  const nav = page.locator(navSelector);
  await expect(nav.getByRole("link")).toHaveCount(4);
  const home = nav.getByRole("link", { name: "الرئيسية", exact: true });
  await expect(home.locator(".nav-tab-label")).toHaveCSS("opacity", "1");
  await nav.getByRole("link", { name: assistantName, exact: true }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(nav.getByRole("link", { name: assistantName, exact: true })).toHaveAttribute("aria-current", "page");
  await expect(home.locator(".nav-tab-label")).toHaveCSS("opacity", "0");
  await expect(nav.locator(".nav-tab-active")).toHaveCount(1);
  await page.getByRole("link", { name: "Nashmi home", exact: true }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "إعادة إرسال رسالة التفعيل", exact: true })).toHaveCount(0);
  await expect(page.getByText(/تابع المستجدات وشارك رأيك/)).toHaveCount(0);
});

test("unverified login retains its contextual verification recovery", async ({ page }) => {
  await page.route("**/api/auth/login", route => route.fulfill({ status: 403, json: { ok: false, error: { code: "EMAIL_NOT_VERIFIED" } } }));
  await page.goto("/login");
  await page.getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await page.locator('[name="email"]').fill("unverified@nashmi.test");
  await page.locator('[name="password"]').fill("Nashmi-QA-2026!Only");
  await page.locator('main button[type="submit"]').click();
  await expect(page).toHaveURL(/\/verify-email\?email=unverified%40nashmi.test$/);
  await expect(page.locator('[name="email"]')).toHaveValue("unverified@nashmi.test");
});

test("message composition protects IME input and retry recovers from a local simulated outage", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/chat", route => {
    if (route.request().method() !== "POST") return route.continue();
    attempts++;
    return attempts === 1 ? route.abort("connectionfailed") : route.fulfill({ json: { ok: true, data: { message: { role: "assistant", content: "تمت إعادة المحاولة" } } } });
  });
  await page.goto("/chat");
  const input = page.getByRole("textbox", { name: messageName });
  await expect(input).toBeEnabled();
  await input.fill("رسالة اختبار");
  await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
  expect(attempts).toBe(0);
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "إعادة المحاولة", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "إعادة المحاولة", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("تمت إعادة المحاولة");
  expect(attempts).toBe(2);
});
