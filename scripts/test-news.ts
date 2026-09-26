import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { activateBatch, batchDocuments, type BatchCandidate } from "../src/lib/news/batchStore";
import { dedupeExactFeedItems, sourceUrlHash } from "../src/lib/news/dedupe";
import { isObviousNonNashmiNews } from "../src/lib/news/editorial";
import { availableFeedLists, FEEDS, parseFeed } from "../src/lib/news/feedParsing";
import { buildActiveNewsQuery, buildRefreshLockFilter } from "../src/lib/news/query";
import { classifyNewsSource, signNewsRefreshWithSecret, validateNewsSourceUrlSyntax, verifyNewsRefreshSignatureWithSecret } from "../src/lib/news/securityCore";
import { parseNewsSelection } from "../src/lib/news/selection";
import ChatSession from "../src/models/ChatSession";
import NewsItem from "../src/models/NewsItem";
import NewsRefreshState from "../src/models/NewsRefreshState";
import { buildOwnedChatSessionQuery } from "../src/lib/ai/chatOwnership";
import { isExplicitCurrentNewsQuestion } from "../src/lib/news/policy";
import { chatSchema, chatSessionSchema } from "../src/lib/validators";

process.env.NEWS_REFRESH_SECRET = "unit-test-news-secret-that-is-longer-than-32-characters";

function testSecurity() {
  const now = 1_800_000_000_000;
  const timestamp = String(now);
  const signature = signNewsRefreshWithSecret(timestamp, process.env.NEWS_REFRESH_SECRET!);
  const request = new Request("https://nashmi.haitham.website/api/internal/news/refresh", { method: "POST", headers: { "x-nashmi-news-timestamp": timestamp, "x-nashmi-news-signature": signature } });
  assert.equal(verifyNewsRefreshSignatureWithSecret(request, process.env.NEWS_REFRESH_SECRET!, now).timestamp, timestamp);
  assert.throws(() => verifyNewsRefreshSignatureWithSecret(request, process.env.NEWS_REFRESH_SECRET!, now + 6 * 60 * 1000), /EXPIRED/);
  for (const unsafe of ["http://pm.gov.jo/news", "https://127.0.0.1/x", "https://localhost/x", "https://user:pass@example.com/x"]) assert.throws(() => validateNewsSourceUrlSyntax(unsafe));
  assert.equal(classifyNewsSource("https://almamlakatv.com/news/123456-"), "reputable_media");
  assert.equal(classifyNewsSource("https://www.almamlakatv.com/news/123456-"), "reputable_media");
  assert.equal(classifyNewsSource("https://royanews.tv/news/123456"), "reputable_media");
  assert.equal(classifyNewsSource("https://pm.gov.jo/news"), "official");
  for (const lookalike of ["https://almamlakatv.com.evil.test/news/123-", "https://evil-almamlakatv.com/news/123-", "https://royanews.tv.evil.test/news"]) assert.equal(classifyNewsSource(lookalike), null);
}

function testDiscoveryRules() {
  const now = new Date("2026-09-25T21:00:00Z");
  const item = (date: string, url = "https://almamlakatv.com/news/210966-") => `<item><title>مجلس الوزراء يقر مشروع قانون الإدارة المحلية</title><description>قرار حكومي جديد يتعلق بمشروع قانون الإدارة المحلية في الأردن.</description><link>${url}</link><pubDate>${date}</pubDate></item>`;
  const feed = (body: string) => `<rss><channel>${body}</channel></rss>`;
  assert.equal(parseFeed(feed(item("Sat, 19 Sep 2026 23:30:00 +0300")), now, FEEDS[0]).length, 1, "six-day-old story must remain eligible");
  assert.equal(parseFeed(feed(item("Thu, 17 Sep 2026 23:30:00 +0300")), now, FEEDS[0]).length, 0, "story older than seven days must be rejected");
  assert.equal(parseFeed(feed(item("Sat, 19 Sep 2026 23:30:00 +0300", "https://almamlakatv.com.evil.test/news/1-")), now, FEEDS[0]).length, 0);
  assert.deepEqual(availableFeedLists([{ status: "rejected", reason: new Error("publisher unavailable") }, { status: "fulfilled", value: parseFeed(feed(item("Sat, 19 Sep 2026 23:30:00 +0300")), now, FEEDS[0]) }]).map((list) => list.length), [0, 1]);
  assert.throws(() => availableFeedLists([{ status: "rejected", reason: new Error("mamlaka") }, { status: "rejected", reason: new Error("roya") }]), /NEWS_ALL_FEEDS_UNAVAILABLE/);
  assert.equal(sourceUrlHash("https://royanews.tv/news/1?utm_source=x"), sourceUrlHash("https://royanews.tv/news/1"));
  const items = [
    { title: "مجلس الوزراء يقر مشروع قانون", url: "https://royanews.tv/news/1" },
    { title: "عنوان مختلف", url: "https://royanews.tv/news/1?utm_source=x" },
    { title: "مجلس الوزراء يقر مشروع قانون", url: "https://almamlakatv.com/news/2-" },
    { title: "مجلس الوزراء يناقش مشروع قانون", url: "https://almamlakatv.com/news/3-" }
  ];
  assert.deepEqual(dedupeExactFeedItems(items), [items[0], items[3]], "URL/title-only dedupe must keep similar but non-identical coverage");
  for (const title of ["مباراة كرة القدم في عمان", "حفل غنائي لفنان مشهور", "جريمة قتل في الأردن", "حادث سير على طريق جرش", "طقس العرب: حالة جوية", "ضبط لحوم منتهية الصلاحية", "بلدية الكرك ضبطت خلال جولتين 205 كيلوغرامات من لحوم العجل المستورد منتهية الصلاحية", "استفتاء رؤيا: ما رأيكم؟"]) assert.equal(isObviousNonNashmiNews(title), true, title);
  for (const title of ["مجلس النواب يناقش مشروع قانون الإدارة المحلية", "مجلس الوزراء يقر سياسة النقل العام", "الهيئة المستقلة للانتخاب تعلن تعليمات جديدة"]) assert.equal(isObviousNonNashmiNews(title), false, title);
  assert.equal(parseNewsSelection({ selected: [{ index: 1, category: "legislation" }] }, 3, 10).length, 1);
  assert.throws(() => parseNewsSelection({ selected: [{ index: 3, category: "legislation" }] }, 3, 10), /INVALID_INDEX/);
  assert.throws(() => parseNewsSelection({ selected: [{ index: 1, category: "legislation" }, { index: 1, category: "government" }] }, 3, 10), /INVALID_INDEX/);
  assert.throws(() => parseNewsSelection({ selected: Array.from({ length: 11 }, (_, index) => ({ index, category: "legislation" })) }, 20, 10));
}

function testQueriesAndChat() {
  const now = new Date("2026-09-25T21:00:00Z");
  const query = buildActiveNewsQuery(now, "current-batch");
  assert.equal(query.batchId, "current-batch");
  assert.equal(buildActiveNewsQuery(now, null).batchId, null, "legacy items remain eligible until the first successful swap");
  assert.equal(query.publishedAt.$gte.toISOString(), "2026-09-18T21:00:00.000Z");
  assert.equal("lastSeenAt" in query, false);
  assert.equal(buildRefreshLockFilter(now)._id, "global");
  const sessionId = "507f1f77bcf86cd799439011";
  const ownerId = "507f191e810c19729de860ea";
  assert.deepEqual(buildOwnedChatSessionQuery(sessionId, ownerId), { _id: sessionId, userId: ownerId, status: { $ne: "deleted" } });
  assert.equal(chatSchema.parse({ message: "test", newsId: sessionId }).newsId, sessionId);
  assert.equal(chatSessionSchema.parse({ newsId: sessionId }).newsId, sessionId);
  assert.equal((ChatSession.schema.path("newsContext") as any).options.immutable, true);
  assert.equal(isExplicitCurrentNewsQuestion("شو آخر تحديث على الموضوع؟"), true);
  assert.equal(isExplicitCurrentNewsQuestion("اشرح أثر القرار"), false);
  assert.ok(NewsItem.schema.indexes().some(([fields]) => fields.batchId === 1 && fields.publishedAt === -1));
}

async function testAtomicBatchSwap() {
  const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  try {
    await mongoose.connect(replicaSet.getUri("nashmi_news_batch_test"));
    const now = new Date("2026-09-25T21:00:00Z");
    const candidate = (titleAr: string, url: string): BatchCandidate => ({ titleAr, summaryAr: "تطور أردني موثق متعلق بمشروع قانون أو قرار حكومي يمس المواطنين.", category: "legislation", urgency: "normal", publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60_000).toISOString(), sources: [{ title: titleAr, url, publisher: "قناة المملكة", sourceClass: "reputable_media" }] });
    const old = candidate("مجلس النواب يناقش مشروع قانون الإدارة المحلية", "https://almamlakatv.com/news/1-");
    await NewsItem.insertMany(batchDocuments([old], "old-batch", now, 7));
    await NewsRefreshState.create({ _id: "global", lockToken: "test-lock", currentBatchId: "old-batch", lastStatus: "running" });
    const fresh = candidate("مجلس الوزراء يقر مشروع قانون جديد", "https://almamlakatv.com/news/2-");
    await assert.rejects(() => activateBatch([fresh], "failed-batch", "wrong-lock", now, 7), /LOCK_LOST/);
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, "old-batch");
    assert.equal(await NewsItem.countDocuments({ batchId: "failed-batch" }), 0);
    assert.equal(await NewsItem.countDocuments({ batchId: "old-batch", isActive: true }), 1);
    await assert.rejects(() => activateBatch([], "empty-batch", "test-lock", now, 7), /BATCH_EMPTY/);
    await assert.rejects(() => activateBatch([{ ...fresh, summaryAr: "قصير" }], "invalid-batch", "test-lock", now, 7));
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, "old-batch");
    assert.equal(await NewsItem.countDocuments({ batchId: "old-batch", isActive: true }), 1);
    assert.equal(await activateBatch([fresh], "new-batch", "test-lock", now, 7), 1);
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, "new-batch");
    assert.equal(await NewsItem.countDocuments({ batchId: "old-batch", isActive: true }), 0);
    assert.equal(await NewsItem.countDocuments(buildActiveNewsQuery(now, "new-batch")), 1);
    await NewsItem.updateOne({ batchId: "new-batch" }, { $set: { status: "hidden", isActive: false } });
    assert.equal(await NewsItem.countDocuments(buildActiveNewsQuery(now, "new-batch")), 0, "admin hide must remove a current item");
    await NewsItem.updateOne({ batchId: "new-batch" }, { $set: { publishedAt: new Date(now.getTime() - 8 * 24 * 60 * 60_000), lastSeenAt: now, status: "published", isActive: true } });
    assert.equal(await NewsItem.countDocuments(buildActiveNewsQuery(now, "new-batch")), 0, "lastSeenAt must not extend seven-day visibility");
  } finally {
    await mongoose.disconnect();
    await replicaSet.stop();
  }
}

async function main() {
  testSecurity();
  testDiscoveryRules();
  testQueriesAndChat();
  await testAtomicBatchSwap();
  console.log("Daily news batch tests passed.");
}

main().catch((error) => { console.error(error); process.exit(1); });
