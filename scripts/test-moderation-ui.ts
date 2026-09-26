import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { chromium, expect } from "@playwright/test";
import { hash } from "bcryptjs";
import User from "../src/models/User";
import Post from "../src/models/Post";
import Comment from "../src/models/Comment";

async function unusedPort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function run() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  process.env.MONGODB_URI = replSet.getUri("nashmi_moderation_ui_test");
  process.env.JWT_SECRET = "moderation-ui-test-jwt-secret-32-characters";
  process.env.RATE_LIMIT_SECRET = "moderation-ui-test-rate-secret-32-characters";
  process.env.GEMINI_API_KEY = "invalid-moderation-ui-test-key";
  let server: ChildProcess | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.create({
      name: "مواطن اختبار", email: "citizen@test.invalid", emailNormalized: "citizen@test.invalid",
      emailVerified: true, status: "active", role: "citizen", passwordHash: await hash("LocalTestPassword123!", 8)
    });
    const post = await Post.create({ authorType: "admin", authorUserId: user._id, content: "منشور محلي لاختبار التعليقات", publisherSnapshot: { name: "ناشر اختبار", type: "admin" } });
    const appEnv: NodeJS.ProcessEnv = { ...process.env, MONGODB_URI: process.env.MONGODB_URI, JWT_SECRET: process.env.JWT_SECRET, RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET };
    server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(port)], { cwd: process.cwd(), env: appEnv, stdio: "ignore", windowsHide: true });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Local Next server exited: ${server.exitCode}`);
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) { ready = true; break; }
      } catch { /* Server is still starting. */ }
      await delay(250);
    }
    if (!ready) throw new Error("Local Next server did not become ready");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const login = await context.request.post(`${baseUrl}/api/auth/login`, { data: { email: user.email, password: "LocalTestPassword123!" } });
    assert.equal(login.status(), 200, `Local citizen login failed: ${login.status()}`);
    const page = await context.newPage();
    await page.route(`**/api/posts/${post._id}/comments`, async (route) => {
      if (route.request().method() === "POST") await delay(500);
      await route.continue();
    });
    await page.goto(`${baseUrl}/updates?filter=posts`);
    const article = page.locator("article").filter({ hasText: "منشور محلي لاختبار التعليقات" }).first();
    await expect(article).toBeVisible();
    await article.locator('button[aria-expanded="false"]').first().click();
    const composer = article.locator("textarea");
    const submit = composer.locator("..").getByRole("button");
    const commentText = (value: string) => article.locator("p.whitespace-pre-line").filter({ hasText: value });
    const criticism = "أنا ضد هذا القرار التجريبي.";
    await composer.fill(criticism);
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(commentText(criticism)).toBeVisible();
    assert.equal((await Post.findById(post._id))?.commentsCount, 0);
    await expect(composer).toBeEnabled();
    await expect(commentText(criticism)).toHaveCount(1);
    assert.equal(await Comment.countDocuments({ targetId: post._id }), 1);
    assert.equal((await Post.findById(post._id))?.commentsCount, 1);

    const flood = "ههههههههههههههههههههههههههههه";
    await composer.fill(flood);
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(commentText(flood)).toBeVisible();
    await expect(article.getByRole("alert")).toContainText("ما قدرنا ننشر التعليق");
    await expect(composer).toHaveValue(flood);
    await expect(composer).toBeFocused();
    await expect(commentText(flood)).toHaveCount(0);
    assert.equal(await Comment.countDocuments({ targetId: post._id }), 1);
    assert.equal((await Post.findById(post._id))?.commentsCount, 1);
    await context.close();
    console.log("Local citizen comment UI smoke passed against an isolated MongoDB replica set.");
  } finally {
    await browser?.close();
    server?.kill();
    await mongoose.disconnect();
    await replSet.stop();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
