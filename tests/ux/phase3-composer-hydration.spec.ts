import { test, expect } from "@playwright/test";
import { authenticate } from "./helpers";

for (const role of ["party", "iec"]) {
  test(`${role}: a composer cannot accept a draft before its handlers are ready`, async ({ page, context }) => {
    await authenticate(context, role);
    let release!: () => void;
    const scriptsReady = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/_next/static/**/*.js", async (route) => {
      await scriptsReady;
      await route.continue();
    });
    try {
      await page.goto(`/${role}-dashboard/posts`, { waitUntil: "commit" });
      const content = page.locator('main textarea[name="content"]');
      await expect(content).toBeVisible();
      await expect(content).toBeDisabled();
      await expect(page.locator('main input[name="title"]')).toBeDisabled();
      release();
      await expect(content).toBeEnabled();
      const draft = "مسودة مبكرة محفوظة بعد جاهزية نموذج النشر";
      await content.fill(draft);
      await expect(content).toHaveValue(draft);
      await expect(page.locator("main form").first().getByRole("button", { name: "نشر", exact: true })).toBeEnabled();
      await content.blur();
      await expect(content).toHaveValue(draft);
    } finally {
      release();
    }
  });
}
