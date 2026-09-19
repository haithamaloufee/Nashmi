import { test, expect } from "@playwright/test";

const dashboardByRole: Record<string, string> = {
  citizen: "/account",
  party: "/party-dashboard",
  admin: "/admin"
};

test("authenticated identity and primary dashboard are accessible", async ({ page, request }, testInfo) => {
  const role = testInfo.project.name;
  const me = await request.get("/api/auth/me");
  expect(me.status()).toBe(200);
  const body = await me.json();
  expect(body.ok).toBe(true);
  const acceptedRoles = role === "admin" ? ["admin", "super_admin"] : [role];
  expect(acceptedRoles).toContain(body.data.user.role);

  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 820 : 1000 });
    await page.goto(dashboardByRole[role], { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `${role} dashboard should not overflow at ${width}px`).toBe(false);
  }
});

test("authorization is enforced by direct API requests", async ({ request }, testInfo) => {
  const role = testInfo.project.name;
  const adminUsers = await request.get("/api/admin/users");
  if (role === "admin") {
    expect(adminUsers.status()).toBe(200);
  } else {
    expect(adminUsers.status()).toBe(403);
    expect(await adminUsers.json()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  }
});

test("party composer exposes safe file upload without publishing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "party", "Party-only read/validation flow");
  await page.goto("/party-dashboard/posts", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[type="file"]').first()).toHaveAttribute("accept", /video\/mp4/);
  await expect(page.locator("form").first()).toContainText("100MB");
  await expect(page.locator('input[type="url"][name*="media"]')).toHaveCount(0);
});
