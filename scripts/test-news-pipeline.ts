import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { eventDraftsFromMaterial, sameNewsEvent } from "../src/lib/news/pipelineCore";
import { publishEventBatch, runNewsDiscovery, runNewsEditorial } from "../src/lib/news/pipeline";
import { NEWS_SOURCES, parseGovernmentArchive, parseGovernmentDetail, type SourceMaterial } from "../src/lib/news/sourceRegistry";
import NewsCandidate from "../src/models/NewsCandidate";
import NewsEvent from "../src/models/NewsEvent";
import NewsItem from "../src/models/NewsItem";
import NewsRefreshState from "../src/models/NewsRefreshState";

const source = NEWS_SOURCES[0];
const now = new Date("2026-09-30T01:00:00.000Z");
const archive = `<a href='/Ar/NewsDetails/test-decision'><div class='media news-block'><p class='date'><span>29/09/2026</span></p><h5 class='card-title'>قرارات مجلس الوزراء بشأن التعليم والنقل العام</h5><p class='card-text'>أعلن مجلس الوزراء عن قرارات جديدة تتعلق بالتعليم والنقل العام في الأردن.</p></div></a>`;
const detail = `<div id='ctl00_ctl00_MainContent_ContentDetails_NewsSection'><p>وافق مجلس الوزراء على مشروع قانون جديد ينظم إجراءات القبول الجامعي في الأردن.</p><p>قرر مجلس الوزراء تعديل تعليمات النقل العام في المحافظات اعتبارا من العام المقبل.</p></div>`;

function testPureRules() {
  const parsed = parseGovernmentArchive(archive, source);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].publishedAt.toISOString(), "2026-09-28T21:00:00.000Z");
  assert.equal(parseGovernmentDetail(detail).length, 2);
  const material: SourceMaterial = { ...parsed[0], paragraphs: parseGovernmentDetail(detail) };
  const drafts = eventDraftsFromMaterial(material, now);
  assert.equal(drafts.length, 2, "one bulletin may contain two independently evidenced decisions");
  assert.ok(drafts.every((item) => item.eligible));
  assert.equal(drafts[0].actionStage, "cabinet_approved_draft");
  assert.equal(sameNewsEvent(drafts[0], drafts[1]), false, "different decisions must not merge");
  assert.equal(sameNewsEvent(drafts[0], { ...drafts[0], titleAr: drafts[0].titleAr }), true);
  const old = eventDraftsFromMaterial(material, new Date(now.getTime() + 49 * 60 * 60_000));
  assert.ok(old.every((item) => !item.eligible && item.reason === "older_than_48_hours"));
  assert.equal(material.publishedAt.toISOString(), "2026-09-28T21:00:00.000Z", "rediscovery never changes original publication time");
}

async function testIngestionAndPublishing() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replSet.getUri("nashmi_news_pipeline_test");
  process.env.NEWS_PIPELINE_TEST_DB = "true";
  process.env.NEWS_REFRESH_SECRET = "test-news-refresh-secret-longer-than-thirty-two-characters";
  try {
    const read = async (url: string) => url.includes("NewsDetails") ? detail : archive;
    const first = await runNewsDiscovery(now, { sources: [source], read });
    assert.equal(first.created, 1);
    assert.equal(first.eligible, 2);
    const second = await runNewsDiscovery(now, { sources: [source], read });
    assert.equal(second.created, 0);
    assert.equal(second.duplicates, 1);
    assert.equal(await NewsCandidate.countDocuments({}), 1);
    assert.equal(await NewsEvent.countDocuments({}), 2);
    const shadow = await runNewsEditorial(now, async (events) => ({ ids: [String(events[0]._id)], model: "test" }));
    assert.equal(shadow.selected, 1);
    assert.equal(shadow.published, 0);
    assert.equal(await NewsItem.countDocuments({}), 0, "shadow selection is never public");
    const event = await NewsEvent.findOne({ status: "eligible" });
    assert.ok(event);
    await NewsRefreshState.updateOne({ _id: "global" }, { $set: { pipelineEditorialLockToken: "test-lock" } });
    await assert.rejects(() => publishEventBatch([event], "failed-batch", "wrong-lock", now), /LOCK_LOST/);
    assert.equal(await NewsItem.countDocuments({}), 0, "failed transaction must not leave a partial batch");
    assert.equal(await publishEventBatch([event], "first-batch", "test-lock", now), 1);
    assert.equal(await NewsItem.countDocuments({}), 1);
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, "first-batch");
    assert.equal(await NewsEvent.countDocuments({ status: "eligible" }), 1, "an unselected event remains eligible");
    await assert.rejects(() => publishEventBatch([event], "repeat-batch", "test-lock", now));
    assert.equal(await NewsItem.countDocuments({}), 1, "published event cannot be inserted twice");
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

async function main() {
  testPureRules();
  await testIngestionAndPublishing();
  console.log("News pipeline parsing, 48-hour window, idempotency, shadow mode and atomic publishing passed.");
}

main().catch((error) => { console.error(error); process.exit(1); });
