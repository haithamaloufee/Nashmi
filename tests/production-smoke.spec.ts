import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import AxeBuilder from "@axe-core/playwright";

const screenshotDir = path.join(process.cwd(), "test-results", "production-smoke");
const fixtureDir = path.join(process.cwd(), "test-results", "fixtures");
const timingsPath = path.join(screenshotDir, "timings.json");

const screenshotPaths: string[] = [];
const timings: Record<string, number> = {};

function ensureDirs() {
  mkdirSync(screenshotDir, { recursive: true });
  mkdirSync(fixtureDir, { recursive: true });
}

async function screenshot(page: Page, name: string) {
  const filePath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshotPaths.push(filePath);
}

async function checkPage(page: Page, route: string, name: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const started = Date.now();
  await page.goto(route, { waitUntil: "domcontentloaded" });
  timings[`load:${name}`] = Date.now() - started;
  await expect(page.locator("body")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow, `${route} should not horizontally overflow at ${viewport.width}px`).toBe(false);
  await screenshot(page, name);
}

async function getProfileId(request: APIRequestContext) {
  const email = process.env.E2E_CITIZEN_EMAIL;
  const password = process.env.E2E_CITIZEN_PASSWORD;
  if (!email || !password) return null;
  const response = await request.post("/api/auth/login", {
    data: { email, password }
  });
  const json = await response.json();
  expect(json.ok).toBeTruthy();
  return json.data.user.id as string;
}

test.beforeAll(() => {
  ensureDirs();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
  writeFileSync(path.join(fixtureDir, "upload-preview.png"), png);
});

test.afterAll(() => {
  writeFileSync(path.join(screenshotDir, "screenshots.json"), JSON.stringify(screenshotPaths, null, 2));
  writeFileSync(timingsPath, JSON.stringify(timings, null, 2));
});

test("critical public routes remain usable at small mobile and tablet widths", async ({ page, request }) => {
  test.setTimeout(600_000);
  const routes = [
    "/", "/updates", "/laws", "/parties", "/surveys", "/about-nashmi", "/iec",
    "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/chat"
  ];
  for (const width of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 700 ? 820 : 1024 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `${route} should not overflow at ${width}px`).toBe(false);
    }
  }

  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const menuButton = page.locator('button[aria-controls="mobile-navigation"]');
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(page.locator("#mobile-navigation nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();

  const response = await request.get("/api/version");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).not.toContain("unsafe-eval");
  expect(home.headers()["strict-transport-security"]).toContain("max-age=31536000");
  const protectedRoute = await request.get("/admin", { maxRedirects: 0 });
  expect(protectedRoute.status()).toBe(307);
  expect(protectedRoute.headers().location).toBe("/login");
  expect(protectedRoute.headers()["cache-control"]).toContain("no-store");
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ ok: true, data: { status: "ok", service: "nashmi" } });
  expect(health.headers()["x-request-id"]).toBeTruthy();
});

test("redesigned navigation stays readable over hero and plain page backgrounds", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const primaryNav = page.locator('nav[aria-label="التنقل الرئيسي"]');
  await expect(primaryNav).toBeVisible();
  await expect(primaryNav.locator("a")).toHaveCount(4);
  await expect(primaryNav.locator('a[href="/updates"]')).toBeVisible();
  await expect(primaryNav.locator('a[href="/laws"]')).toBeVisible();
  await expect(primaryNav.locator('a[href="/parties"]')).toBeVisible();
  await expect(primaryNav.locator('a[href="/about-nashmi"], a[href="/iec"], a[href="/chat"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "دخول" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إنشاء حساب مواطن" })).toBeVisible();

  const homeHeaderColor = await page.locator("header").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(homeHeaderColor).not.toBe("rgba(0, 0, 0, 0)");

  await page.getByRole("button", { name: "إعدادات العرض واللغة" }).click();
  const utilityMenu = page.locator("#navbar-utility-menu");
  await expect(utilityMenu.getByRole("link", { name: "عن نشمي", exact: true })).toBeVisible();
  await expect(utilityMenu.getByRole("link", { name: "مصادر ومعلومات رسمية", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "تغيير اللغة" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.goto("/updates", { waitUntil: "domcontentloaded" });
  const internalHeaderColor = await page.locator("header").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(internalHeaderColor).toBe("rgb(16, 37, 43)");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const menuButton = page.locator('button[aria-controls="mobile-navigation"]');
  await menuButton.click();
  const mobileMenu = page.locator("#mobile-navigation");
  await expect(mobileMenu).toBeVisible();
  const mobileMenuColor = await mobileMenu.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(mobileMenuColor).not.toBe("rgba(0, 0, 0, 0)");
  await expect(mobileMenu.getByRole("link", { name: "Home" })).toBeVisible();
  await page.mouse.click(380, 830);
  await expect(mobileMenu).toBeHidden();
  await menuButton.click();
  await mobileMenu.locator('a[href="/laws"]').click();
  await page.waitForURL("**/laws");
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await menuButton.click();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();
});

test("party and authority profiles use a single social timeline without mixed-language actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/parties", { waitUntil: "domcontentloaded" });
  const firstPartyHref = await page.locator('a[href^="/parties/"]').first().getAttribute("href");
  expect(firstPartyHref).toBeTruthy();
  await page.goto(firstPartyHref!, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/View party timeline|عرض تحديثات الحزب \/ View/i)).toHaveCount(0);
  await expect(page.locator("#profile-posts")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.goto("/iec", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#profile-posts")).toBeVisible();
  await expect(page.locator("#profile-posts article").first()).toBeVisible();
  await expect(page.locator("#profile-posts h2")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("login recovery actions follow the password field", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const passwordBox = await page.locator('input[name="password"]').boundingBox();
  const forgotBox = await page.getByRole("link", { name: "نسيت كلمة المرور؟" }).boundingBox();
  expect(passwordBox).toBeTruthy();
  expect(forgotBox).toBeTruthy();
  expect(forgotBox!.y).toBeGreaterThan(passwordBox!.y + passwordBox!.height);
  await expect(page.getByText(/HttpOnly|localStorage|Cookie/)).toHaveCount(0);
});

test("critical public pages have no serious automated accessibility violations", async ({ page }) => {
  test.setTimeout(240_000);
  for (const route of ["/", "/laws", "/parties", "/updates", "/surveys", "/login"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || ""));
    expect(serious, `${route} contains serious accessibility violations`).toEqual([]);
  }
});

test("public pages, post media, comments, profiles, and navbar prefetch", async ({ page, request }) => {
  test.setTimeout(360_000);
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const prefetchedUrls = new Set<string>();

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("_rsc=")) prefetchedUrls.add(url);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.includes("/api/auth/me")) failedRequests.push(`${response.status()} ${url}`);
  });

  await checkPage(page, "/", "homepage-mobile-390x844", { width: 390, height: 844 });
  await checkPage(page, "/", "homepage-tablet-768x1024", { width: 768, height: 1024 });
  await checkPage(page, "/", "homepage-desktop-1440x900", { width: 1440, height: 900 });
  await checkPage(page, "/", "homepage-wide-1920x1080", { width: 1920, height: 1080 });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const privatePrefetch = [...prefetchedUrls].filter((url) => url.includes("/admin") || url.includes("dashboard"));
  expect(privatePrefetch, "navbar prefetch must not touch private/admin routes").toEqual([]);

  const navRoutes = ["/updates", "/parties", "/laws"];
  for (const route of navRoutes) {
    const started = Date.now();
    await page.locator(`nav a[href="${route}"]`).first().click();
    await page.waitForURL(`**${route}`);
    timings[`nav:${route}`] = Date.now() - started;
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }

  expect([...prefetchedUrls].some((url) => url.includes("/updates") || url.includes("/parties") || url.includes("/laws"))).toBe(true);

  await checkPage(page, "/updates", "updates-desktop-no-forced-post-media", { width: 1440, height: 1000 });
  await expect(page.locator("article").first()).toBeVisible();
  await checkPage(page, "/updates", "updates-mobile-360-no-forced-post-media", { width: 360, height: 820 });
  await expect(page.locator("article").first()).toBeVisible();
  await checkPage(page, "/updates", "updates-mobile-390-no-forced-post-media", { width: 390, height: 840 });
  await checkPage(page, "/updates", "updates-mobile-430-no-forced-post-media", { width: 430, height: 860 });

  await checkPage(page, "/iec", "iec-desktop-no-forced-post-media", { width: 1440, height: 1000 });
  await expect(page.locator("article").first()).toBeVisible();
  await checkPage(page, "/iec", "iec-mobile-no-forced-post-media", { width: 360, height: 820 });

  await checkPage(page, "/parties", "navbar-parties", { width: 1440, height: 900 });
  await checkPage(page, "/laws", "navbar-laws", { width: 1440, height: 900 });

  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto("/updates", { waitUntil: "domcontentloaded" });
  const allFilter = page.getByRole("button", { name: "الكل", exact: true });
  await expect(allFilter).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "استبيانات", exact: true }).click();
  await expect(page.locator("article").first()).toBeVisible();
  await page.getByRole("button", { name: "منشورات", exact: true }).click();
  await expect(page.getByRole("button", { name: /تعليق/ }).first()).toBeVisible();
  const assistantBox = await page.locator(".fixed.left-2, .fixed.sm\\:left-6").first().boundingBox();
  expect(assistantBox?.x || 0).toBeLessThan(24);
  await screenshot(page, "navbar-logo-mobile");

  await page.getByRole("button", { name: /تعليق/ }).first().click();
  await expect(page.locator("textarea[aria-label*='تعليق']")).toBeVisible();
  await screenshot(page, "comment-section-avatar-profile-link");

  const profileId = await getProfileId(request);
  if (profileId) {
    await checkPage(page, `/users/${profileId}`, "public-profile-desktop", { width: 1440, height: 900 });
    await checkPage(page, `/users/${profileId}`, "public-profile-mobile", { width: 360, height: 820 });
  }

  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("party post creation uses upload field, preview, and 100MB validation", async ({ page }) => {
  test.skip(!process.env.E2E_PARTY_EMAIL || !process.env.E2E_PARTY_PASSWORD, "Authenticated E2E credentials are not configured");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTY_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTY_PASSWORD!);
  await page.getByRole("button", { name: /دخول/ }).click();
  await page.waitForURL("**/");

  await page.goto("/party-dashboard/posts", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[type="file"]').first()).toHaveAttribute("accept", /video\/mp4/);
  await expect(page.locator("form").first()).toContainText("100MB");
  await expect(page.locator('input[type="url"][name*="media"], input[placeholder*="رابط صورة"][name*="media"]')).toHaveCount(0);
  await screenshot(page, "post-creation-file-upload-no-url");

  await page.locator('input[type="file"]').first().setInputFiles(path.join(fixtureDir, "upload-preview.png"));
  await expect(page.locator("form").first().locator("img, video").first()).toBeVisible();
  await screenshot(page, "upload-preview-progress-ui");
});
