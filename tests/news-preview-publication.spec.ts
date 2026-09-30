import { test, expect } from "@playwright/test";

test("published Preview batch links to the correct chat and respects admin hide", async ({ page }) => {
  test.skip(process.env.E2E_NEWS_PREVIEW_PUBLICATION !== "true", "Explicit isolated Preview publication test only");
  test.setTimeout(180_000);
  const origin = process.env.E2E_BASE_URL!;
  expect(new URL(origin).hostname).toMatch(/^nashmi-.+\.vercel\.app$/);
  const login = await page.request.post("/api/auth/login", { data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }, headers: { Origin: origin } });
  expect(login.ok()).toBe(true);
  const live = await (await page.request.get("/api/news/live")).json();
  expect(live.ok).toBe(true);
  const items = live.data.items;
  expect(items.length).toBeGreaterThan(0);
  expect(items.length).toBeLessThanOrEqual(20);
  const item = items[0];
  expect(item.sources.length).toBeGreaterThan(0);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const original = page.locator(`[data-original="true"][href*="news=${item.id}"]`);
  await expect(original).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await original.click();
  await expect(page).toHaveURL(new RegExp(`news=${item.id}`));
  await expect(page.getByText(item.titleAr, { exact: false }).first()).toBeVisible();
  const sessions = await (await page.request.get("/api/chat/sessions")).json();
  const session = sessions.data.sessions.find((row: any) => row.newsContext?.newsId === item.id);
  expect(session).toBeTruthy();
  expect(session.newsContext.titleAr).toBe(item.titleAr);
  expect(session.newsContext.publishedAt).toBe(item.publishedAt);
  expect(session.newsContext.sources.map((row: any) => row.url)).toEqual(item.sources.map((row: any) => row.url));
  expect(session.newsContext.eventStatus).toBe(item.eventStatus);
  await page.screenshot({ path: "test-results/news-preview-chat.png", fullPage: true });
  try {
    const hidden = await page.request.patch(`/api/admin/news/${item.id}`, { data: { hidden: true }, headers: { Origin: origin } });
    expect(hidden.ok()).toBe(true);
    const hiddenLive = await (await page.request.get("/api/news/live")).json();
    expect(hiddenLive.data.items.some((row: any) => row.id === item.id)).toBe(false);
    const denied = await page.request.post("/api/chat/sessions", { data: { newsId: item.id }, headers: { Origin: origin } });
    expect(denied.status()).toBe(404);
  } finally {
    const restored = await page.request.patch(`/api/admin/news/${item.id}`, { data: { hidden: false }, headers: { Origin: origin } });
    expect(restored.ok()).toBe(true);
  }
  await page.goto("/admin/news", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await page.screenshot({ path: "test-results/news-preview-admin.png", fullPage: true });
});
