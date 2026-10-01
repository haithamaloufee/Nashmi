import { test, expect } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { localDatabase } from "./local-db";

test("verification, reset and setup commit through actual local browser forms", async ({ page }, info) => {
  const db = await localDatabase();
  const token = () => randomBytes(32).toString("base64url");
  const verification = token(), reset = token(), setup = token();
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const inserted = await db.collection("users").insertOne({ name: "اختبار الروابط الآمنة", email: `qa-links-${info.project.name}@nashmi.test`, emailNormalized: `qa-links-${info.project.name}@nashmi.test`, role: "citizen", status: "pending", emailVerified: false, sessionVersion: 0,
    emailVerificationTokenHash: hash(verification), emailVerificationExpiresAt: new Date(Date.now() + 3600_000), passwordResetTokenHash: hash(reset), passwordResetExpiresAt: new Date(Date.now() + 3600_000), passwordSetupTokenHash: hash(setup), passwordSetupExpiresAt: new Date(Date.now() + 3600_000), passwordSetupTargetStatus: "active" });
  try {
    await page.goto(`/verify-email?token=${verification}`);
    await expect(page.getByText("تم تفعيل بريدك. يمكنك الآن تسجيل الدخول.", { exact: true })).toBeVisible();
    expect((await db.collection("users").findOne({ _id: inserted.insertedId }))?.emailVerified).toBe(true);
    const password = "Nashmi-New-QA-2026!Only";
    for (const [path, secureToken] of [["reset-password", reset], ["set-password", setup]]) {
      await page.goto(`/${path}?token=${secureToken}`);
      await expect(page.locator('button[aria-controls="mobile-navigation"]')).toBeEnabled();
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmation"]').fill(password);
      const response = page.waitForResponse(response => response.url().endsWith(`/api/auth/${path}`) && response.request().method() === "POST");
      await page.getByRole("button", { name: "حفظ كلمة المرور", exact: true }).click();
      expect((await response).status()).toBe(200);
      await expect(page.getByText("تم حفظ كلمة المرور وإبطال الجلسات السابقة.", { exact: true })).toBeVisible();
    }
    const user = await db.collection("users").findOne({ _id: inserted.insertedId });
    expect(user?.status).toBe("active");
    expect(user?.sessionVersion).toBe(2);
    expect(user?.passwordResetTokenHash).toBeNull();
    expect(user?.passwordSetupTokenHash).toBeNull();
    expect(await bcrypt.compare(password, user!.passwordHash)).toBe(true);
  } finally { await db.collection("users").deleteOne({ _id: inserted.insertedId }); await db.close(); }
  // SMTP is deliberately unconfigured; successful persistence does not claim email delivery.
});
