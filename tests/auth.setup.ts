import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

setup("authenticate configured role", async ({ request }, testInfo) => {
  const role = testInfo.project.name.replace(/^setup-/, "");
  const prefix = `E2E_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  expect(email, `${prefix}_EMAIL is required`).toBeTruthy();
  expect(password, `${prefix}_PASSWORD is required`).toBeTruthy();

  const response = await request.post("/api/auth/login", { data: { email, password } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  const acceptedRoles = role === "admin" ? ["admin", "super_admin"] : [role];
  expect(acceptedRoles).toContain(body.data.user.role);

  const authDir = path.join(process.cwd(), "playwright", ".auth");
  mkdirSync(authDir, { recursive: true });
  await request.storageState({ path: path.join(authDir, `${role}.json`) });
});
