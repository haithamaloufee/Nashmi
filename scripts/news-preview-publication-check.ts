import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { verifyNewsPreviewIsolation } from "../src/lib/news/previewIsolation";
import { assertPipelineWriteIsolation, publishEventBatch } from "../src/lib/news/pipeline";
import NewsItem from "../src/models/NewsItem";
import NewsEvent from "../src/models/NewsEvent";
import NewsRefreshState from "../src/models/NewsRefreshState";
import User from "../src/models/User";

async function main() {
  process.env.MONGODB_URI = parse(readFileSync(".env.preview.local")).MONGODB_URI;
  process.env.VERCEL_ENV = "preview";
  process.env.NEWS_PIPELINE_MODE = "shadow";
  process.env.NEWS_AUTO_PUBLISH = "false";
  const isolation = await verifyNewsPreviewIsolation();
  assert.equal(isolation.database, "nashmi_preview");
  await assertPipelineWriteIsolation();
  const action = process.argv[2] || "transaction";
  try {
    if (action === "prepare-admin") {
      // Needed solely to exercise the real authorized hide/chat HTTP routes.
      // No existing user's password, role or permissions are modified.
      const email = `news-preview-${randomUUID()}@example.invalid`;
      const password = randomBytes(32).toString("hex");
      const user = await User.create({ name: "اختبار أخبار Preview", email, emailNormalized: email, emailVerified: true, role: "admin", status: "active", provider: "credentials", passwordHash: await bcrypt.hash(password, 12) });
      writeFileSync(".env.news-admin-test.local", `E2E_ADMIN_EMAIL=${email}\nE2E_ADMIN_PASSWORD=${password}\nPREVIEW_TEST_USER_ID=${user._id}\n`);
      console.log(JSON.stringify({ database: isolation.database, dedicatedPreviewTestAccountCreated: true }));
      return;
    }
    if (action === "disable-admin") {
      const account = parse(readFileSync(".env.news-admin-test.local"));
      const result = await User.updateOne({ _id: account.PREVIEW_TEST_USER_ID, emailNormalized: account.E2E_ADMIN_EMAIL, name: "اختبار أخبار Preview" }, { $set: { status: "disabled" }, $inc: { sessionVersion: 1 } });
      assert.equal(result.matchedCount, 1);
      console.log(JSON.stringify({ dedicatedPreviewTestAccountDisabled: true }));
      return;
    }
    const before = await NewsRefreshState.findById("global");
    process.env.NEWS_PIPELINE_MODE = "new";
    process.env.NEWS_AUTO_PUBLISH = "true";
    process.env.NEWS_PREVIEW_TEST_PUBLISH = "true";
    const count = await NewsItem.countDocuments({});
    const now = new Date();
    const event = await NewsEvent.findOne({ status: action === "repeat" ? "published" : "eligible", publishedAt: { $gte: new Date(now.getTime() - 48 * 60 * 60_000), $lte: now } });
    assert.ok(event, "a real current event is required");
    const token = `preview-test-${randomUUID()}`;
    assert.ok(!before?.pipelineEditorialLockUntil || before.pipelineEditorialLockUntil < now, "another editorial job is not running");
    await NewsRefreshState.updateOne({ _id: "global" }, { $set: { pipelineEditorialLockToken: token, pipelineEditorialLockUntil: new Date(now.getTime() + 60_000) } });
    try {
      if (action === "capacity") {
        // Synthetic capacity boundary only; every transaction is deliberately
        // aborted before visibility. These are never stored as real news/events.
        const synthetic = Array.from({ length: 21 }, (_, index) => ({ ...event.toObject(), _id: new mongoose.Types.ObjectId(), titleAr: `اختبار سعة اصطناعي غير منشور رقم ${index + 1}` }));
        process.env.NEWS_MAX_NEW_ITEMS = "20";
        await assert.rejects(() => publishEventBatch(synthetic, `preview-capacity-${randomUUID()}`, token, now), /BATCH_TOO_LARGE/);
        await assert.rejects(() => publishEventBatch(synthetic.slice(0, 20), `preview-capacity-${randomUUID()}`, "deliberately-wrong-lock", now), /LOCK_LOST/);
      } else if (action === "transaction") await assert.rejects(() => publishEventBatch([event], `preview-failure-${randomUUID()}`, "deliberately-wrong-lock", now), /LOCK_LOST/);
      else if (action === "repeat") await assert.rejects(() => publishEventBatch([event], `preview-repeat-${randomUUID()}`, token, now));
      else throw new Error("PREVIEW_TEST_ACTION_INVALID");
      assert.equal(await NewsItem.countDocuments({}), count);
      assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, before?.currentBatchId);
      console.log(JSON.stringify({ environment: "isolated_preview_database_via_local_harness", database: isolation.database, action, passed: true, publicItemsUnchanged: count, currentBatchUnchanged: before?.currentBatchId || null }));
    } finally {
      await NewsRefreshState.updateOne({ _id: "global", pipelineEditorialLockToken: token }, { $set: { pipelineEditorialLockToken: null, pipelineEditorialLockUntil: null } });
    }
  } finally { await mongoose.disconnect(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.name : "PREVIEW_PUBLICATION_CHECK_FAILED"); process.exit(1); });
