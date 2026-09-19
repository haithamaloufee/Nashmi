import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

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
  test.setTimeout(360_000);
  const routes = ["/", "/laws", "/parties", "/updates", "/surveys", "/login", "/signup", "/chat"];
  for (const width of [320, 390, 768]) {
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

  await checkPage(page, "/", "homepage-desktop", { width: 1440, height: 1000 });
  await checkPage(page, "/", "homepage-mobile-360", { width: 360, height: 780 });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const privatePrefetch = [...prefetchedUrls].filter((url) => url.includes("/admin") || url.includes("dashboard"));
  expect(privatePrefetch, "navbar prefetch must not touch private/admin routes").toEqual([]);

  const navRoutes = ["/updates", "/parties", "/iec", "/laws"];
  for (const route of navRoutes) {
    const started = Date.now();
    await page.locator(`nav a[href="${route}"]`).first().click();
    await page.waitForURL(`**${route}`);
    timings[`nav:${route}`] = Date.now() - started;
    await page.goto("/", { waitUntil: "domcontentloaded" });
  }

  expect([...prefetchedUrls].some((url) => url.includes("/updates") || url.includes("/parties") || url.includes("/iec") || url.includes("/laws"))).toBe(true);

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

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
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
