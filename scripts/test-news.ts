import assert from "node:assert/strict";
import { canonicalNewsHash, newsTitleSimilarity, sourceUrlHash } from "../src/lib/news/dedupe";
import { classifyNewsSource, signNewsRefreshWithSecret, validateNewsSourceUrlSyntax, verifyNewsRefreshSignatureWithSecret } from "../src/lib/news/securityCore";
import { isExplicitCurrentNewsQuestion } from "../src/lib/news/policy";
import { chatSchema, chatSessionSchema } from "../src/lib/validators";
import ChatSession from "../src/models/ChatSession";
import NewsItem from "../src/models/NewsItem";
import { buildOwnedChatSessionQuery } from "../src/lib/ai/chatOwnership";
import { buildActiveNewsQuery, buildRefreshLockFilter } from "../src/lib/news/query";
import { isNashmiRelevant } from "../src/lib/news/relevance";

process.env.NEWS_REFRESH_SECRET = "unit-test-news-secret-that-is-longer-than-32-characters";

function testHmac() {
  const now = 1_800_000_000_000;
  const timestamp = String(now);
  const signature = signNewsRefreshWithSecret(timestamp, process.env.NEWS_REFRESH_SECRET!);
  const request = new Request("https://nashmi.haitham.website/api/internal/news/refresh", { method: "POST", headers: { "x-nashmi-news-timestamp": timestamp, "x-nashmi-news-signature": signature } });
  assert.equal(verifyNewsRefreshSignatureWithSecret(request, process.env.NEWS_REFRESH_SECRET!, now).timestamp, timestamp);
  assert.throws(() => verifyNewsRefreshSignatureWithSecret(new Request(request.url, { method: "POST", headers: { "x-nashmi-news-timestamp": timestamp, "x-nashmi-news-signature": "0".repeat(64) } }), process.env.NEWS_REFRESH_SECRET!, now), /INVALID/);
  assert.throws(() => verifyNewsRefreshSignatureWithSecret(request, process.env.NEWS_REFRESH_SECRET!, now + 6 * 60 * 1000), /EXPIRED/);
}

function testSourceSafety() {
  assert.equal(validateNewsSourceUrlSyntax("https://pm.gov.jo/news").hostname, "pm.gov.jo");
  for (const unsafe of ["http://pm.gov.jo/news", "https://127.0.0.1/x", "https://169.254.169.254/latest", "https://localhost/x", "https://user:pass@example.com/x"]) {
    assert.throws(() => validateNewsSourceUrlSyntax(unsafe));
  }
  assert.equal(classifyNewsSource("https://pm.gov.jo/news"), "official");
  assert.equal(classifyNewsSource("https://www.rhc.jo/ar/news"), "official");
  assert.equal(classifyNewsSource("https://www.representatives.jo/AR/News"), "official");
  assert.equal(classifyNewsSource("https://www.jrtv.gov.jo/news"), "official");
  assert.equal(classifyNewsSource("https://pt1.petra.gov.jo/ar/news/search/news_week/2026-09-23"), "news_agency");
  assert.equal(classifyNewsSource("https://org.petra.gov.jo/"), "news_agency");
  assert.equal(classifyNewsSource("https://almamlaka.tv/news"), "reputable_media");
  assert.equal(classifyNewsSource("https://royanews.tv/news"), "reputable_media");
  assert.equal(classifyNewsSource("https://www.alrai.com/article"), "reputable_media");
  assert.equal(classifyNewsSource("https://www.addustour.com/articles"), "reputable_media");
  assert.equal(classifyNewsSource("https://www.jordannews.jo/news"), "reputable_media");
  assert.equal(classifyNewsSource("https://www.facebook.com/JRTVMedia"), null);
  assert.equal(classifyNewsSource("https://example.com/news"), null);
}

function testDedupe() {
  assert.equal(canonicalNewsHash("مجلس النواب يناقش مشروع قانون جديد", new Date("2026-09-22T10:00:00Z")), canonicalNewsHash("يناقش مجلس النواب مشروع قانون جديد", new Date("2026-09-22T21:00:00Z")));
  assert.ok(newsTitleSimilarity("الحكومة تقر نظام النقل العام الجديد", "إقرار نظام جديد للنقل العام من الحكومة") >= 0.5);
  assert.equal(sourceUrlHash("https://pm.gov.jo/a?utm_source=x&id=2#top"), sourceUrlHash("https://pm.gov.jo/a?id=2"));
}

function testSchemasAndIndexes() {
  const id = "507f1f77bcf86cd799439011";
  assert.equal(chatSchema.parse({ message: "test", newsId: id }).newsId, id);
  assert.equal(chatSessionSchema.parse({ newsId: id }).newsId, id);
  assert.equal((ChatSession.schema.path("newsContext") as any).options.immutable, true);
  const ttl = NewsItem.schema.indexes().find(([fields]) => fields.expiresAt === 1);
  assert.equal(ttl?.[1]?.expireAfterSeconds, 0);
  assert.ok(NewsItem.schema.indexes().some(([fields]) => fields.status === 1 && fields.publishedAt === -1));
}

function testSearchPolicy() {
  assert.equal(isExplicitCurrentNewsQuestion("شو آخر تحديث على الموضوع؟"), true);
  assert.equal(isExplicitCurrentNewsQuestion("شو اخر الاخبار عنا بالاردن؟"), true);
  assert.equal(isExplicitCurrentNewsQuestion("What is the latest news in Jordan?"), true);
  assert.equal(isExplicitCurrentNewsQuestion("اشرح لي أثر هذا القرار"), false);
}

function testIsolationAndRetentionQueries() {
  const sessionId = "507f1f77bcf86cd799439011";
  const ownerId = "507f191e810c19729de860ea";
  const query = buildOwnedChatSessionQuery(sessionId, ownerId);
  assert.deepEqual(query, { _id: sessionId, userId: ownerId, status: { $ne: "deleted" } });
  assert.throws(() => buildOwnedChatSessionQuery(sessionId, "not-an-owner-id"), /NOT_FOUND/);

  const now = new Date("2026-09-22T12:00:00Z");
  const active = buildActiveNewsQuery(now, 1);
  assert.equal(active.lastSeenAt.$gte.toISOString(), "2026-09-22T11:00:00.000Z");
  assert.equal(active.expiresAt.$gt, now);
  const lock = buildRefreshLockFilter(now);
  assert.equal(lock._id, "global");
  assert.ok(lock.$or.some((condition) => "lockUntil" in condition));
}

function testEditorialRelevance() {
  const base = { titleAr: "خبر أردني موثق عن الخدمات العامة", summaryAr: "تطور أردني موثق يستدعي اطلاع المواطنين عليه.", category: "public_services" as const, nashmiRelevant: true, relevanceReason: "خبر محلي جديد يهم المواطنين في الأردن", civicImpact: "low" as const };
  assert.equal(isNashmiRelevant(base), true);
  assert.equal(isNashmiRelevant({ ...base, nashmiRelevant: false }), false);
  assert.equal(isNashmiRelevant({ ...base, relevanceReason: "غير مهم" }), false);
}

testHmac();
testSourceSafety();
testDedupe();
testSchemasAndIndexes();
testSearchPolicy();
testIsolationAndRetentionQueries();
testEditorialRelevance();
console.log("News security and behavior tests passed.");
