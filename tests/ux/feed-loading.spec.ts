import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("mobile feed avoids eager full-route preloads, preserves intent navigation and heading order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const lawRequests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/laws" && url.searchParams.has("_rsc")) lawRequests.push(url.pathname);
  });
  await page.goto("/updates");
  await expect(page.locator("[data-feed-region] input.social-search-input[aria-label]")).toBeEnabled();
  const result = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze();
  expect(result.violations).toEqual([]);
  // Exceed the former 2.5s idle timeout; unrelated full pages must not be fetched.
  await page.waitForTimeout(2800);
  expect(lawRequests).toEqual([]);
  const laws = page.locator('nav[aria-label="التنقل الرئيسي"]').getByRole("link", { name: "افهم قانونك", exact: true });
  const intent = page.waitForRequest(request => new URL(request.url()).pathname === "/laws" && new URL(request.url()).searchParams.has("_rsc"));
  await laws.focus();
  await intent;
  await laws.click();
  await expect(page).toHaveURL(/\/laws$/);
  await expect(page.locator("main h1")).toBeVisible();
});
