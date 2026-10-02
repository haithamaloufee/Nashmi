import { test, expect } from "@playwright/test";

for (const width of [390, 1440]) test(`icon-only launcher drags, docks and still opens and dismisses ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/updates");
  await expect(page.locator('[data-feed-region] input.social-search-input[aria-label]')).toBeEnabled();
  const launcher = page.locator(".floating-assistant");
  const button = launcher.getByRole("button", { name: "المساعد الذكي", exact: true });
  await expect(launcher.getByRole("button")).toHaveCount(2);
  await expect(launcher.locator("svg.lucide-move-vertical")).toHaveCount(0);
  await expect(button).toHaveText("");
  const initial = (await button.boundingBox())!;
  expect(initial.width).toBe(56);
  expect(initial.height).toBe(56);
  const drag = async (x: number, y: number) => {
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + 28, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 12 });
    await page.mouse.up();
  };
  await drag(width * 0.64, 370);
  await expect.poll(async () => (await button.boundingBox())!.x).toBeGreaterThan(width - 90);
  await expect(launcher.locator("section")).toHaveCount(0);
  const right = (await button.boundingBox())!;
  expect(right.y).toBeLessThan(initial.y - 100);
  await drag(width * 0.28, 490);
  await expect.poll(async () => (await button.boundingBox())!.x).toBeLessThan(30);
  expect((await button.boundingBox())!.y).toBeGreaterThan(right.y + 80);
  await button.focus();
  await button.press("ArrowRight");
  await expect.poll(async () => (await button.boundingBox())!.x).toBeGreaterThan(width - 90);
  const oldY = (await button.boundingBox())!.y;
  await button.press("ArrowUp");
  expect((await button.boundingBox())!.y).toBeCloseTo(oldY - 24, 0);
  await page.screenshot({ path: info.outputPath(`launcher-docked-${width}.png`) });
  await button.press("Enter");
  const panel = launcher.locator("section");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "رسالة إلى المساعد الذكي" })).toBeEnabled();
  const bounds = (await panel.boundingBox())!;
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  await panel.getByRole("button", { name: "إغلاق المساعد", exact: true }).click();
  await expect(button).toBeFocused();
  await expect.poll(async () => (await button.boundingBox())!.x).toBeGreaterThan(width - 90);
  await launcher.getByRole("button", { name: "إخفاء المساعد حتى إعادة تحميل الصفحة", exact: true }).click();
  await expect(launcher).toHaveCount(0);
  await page.reload();
  await expect(button).toBeVisible();
  await expect(panel).toHaveCount(0);
});

test("touch-emulated launcher docks without opening after a drag", async ({ browser }, info) => {
  test.skip(info.project.name !== "chromium", "Chromium CDP touch emulation; not a physical Android keyboard test.");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: "http://127.0.0.1:3020" });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      (window as any).__launcherEvents = [];
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "click"]) document.addEventListener(type, event => {
        if (!(event.target as Element)?.closest('.floating-assistant button[aria-describedby]')) return;
        const pointer = event as PointerEvent;
        (window as any).__launcherEvents.push({ type, x: pointer.clientX, y: pointer.clientY, pointerType: pointer.pointerType, primary: pointer.isPrimary, button: pointer.button, detail: pointer.detail });
      }, true);
    });
    await page.goto("/updates");
    await expect(page.locator('[data-feed-region] input.social-search-input[aria-label]')).toBeEnabled();
    const button = page.locator(".floating-assistant").getByRole("button", { name: "المساعد الذكي", exact: true });
    const box = (await button.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 28, y: box.y + 30 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 270, y: 400 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => (await button.boundingBox())!.x).toBeGreaterThan(310);
    await expect(page.locator(".floating-assistant section")).toHaveCount(0);
    const target = (await button.boundingBox())!;
    await page.touchscreen.tap(target.x + 28, target.y + 30);
    await info.attach("touch-launcher-events", { body: JSON.stringify(await page.evaluate(() => (window as any).__launcherEvents), null, 2), contentType: "application/json" });
    await expect(page.locator(".floating-assistant section")).toBeVisible();
  } finally { await context.close(); }
});
