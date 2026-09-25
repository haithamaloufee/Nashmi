import assert from "node:assert/strict";
import { canonicalNewsHash, isSameNewsEvent, newsTitleSimilarity, sourceUrlHash } from "../src/lib/news/dedupe";
import { isPublishableDecision, obviousCivicDecision, prefilterCivicNews } from "../src/lib/news/editorial";
import { FEEDS, parseFeed } from "../src/lib/news/feedParsing";
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
  assert.equal(classifyNewsSource("https://almamlakatv.com/news/123456-"), "reputable_media");
  assert.equal(classifyNewsSource("https://www.almamlakatv.com/news/123456-"), "reputable_media");
  assert.equal(classifyNewsSource("https://royanews.tv/news"), "reputable_media");
  for (const lookalike of ["https://almamlakatv.com.evil.test/news/123-", "https://evil-almamlakatv.com/news/123-", "https://royanews.tv.evil.test/news", "https://notroyanews.tv/news"]) {
    assert.equal(classifyNewsSource(lookalike), null);
  }
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
  assert.equal(isSameNewsEvent("مجلس النواب يقر مشروع قانون الإدارة المحلية الجديد", "إقرار مشروع قانون الإدارة المحلية في مجلس النواب"), true);
  assert.equal(isSameNewsEvent("مجلس النواب يناقش مشروع قانون الإدارة المحلية", "مجلس النواب يناقش مشروع قانون الأحزاب"), false);
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
  assert.equal(active.publishedAt.$gte.toISOString(), "2026-09-22T11:00:00.000Z");
  assert.equal(active.publishedAt.$lte, now);
  assert.equal("lastSeenAt" in active, false);
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
  const allowed = [
    "مجلس الوزراء يقر مشروع قانون الإدارة المحلية",
    "مجلس النواب يناقش تعديل قانون الأحزاب",
    "الهيئة المستقلة للانتخاب تعلن تعليمات انتخابية جديدة",
    "الحكومة تعلن قرارا جديدا بشأن سياسة النقل العام",
    "أمانة عمان تعلن نظاما جديدا للبلديات",
    "الاحزاب السياسية تعلن قرارا تنظيميا بشأن التسجيل"
  ];
  for (const title of allowed) assert.equal(prefilterCivicNews(title, "قرار جديد يؤثر على المواطنين الأردنيين"), true, title);
  const rejected = [
    "ضبط إطارات منتهية الصلاحية في عمان", "ضبط لحوم منتهية الصلاحية", "ضبط مخالفة مائية في الكرك",
    "جريمة قتل في عمان", "حادث سير في اربد", "مباراة كرة القدم اليوم", "مهرجان غنائي في الأردن",
    "إعلان تجاري جديد", "استطلاع رأي: ما رأيكم في خدمات الحكومة؟", "حملة تفتيش روتينية على المحال"
  ];
  for (const title of rejected) assert.equal(prefilterCivicNews(title, "خبر من الأردن عن وزارة الصحة ومجلس الوزراء"), false, title);
  assert.equal(obviousCivicDecision(allowed[0], "", 0)?.reasonCode, "NEW_LEGISLATION");
  assert.equal(obviousCivicDecision(rejected[0], "مجلس الوزراء", 0), null);
  assert.equal(isPublishableDecision(undefined), false);
  assert.equal(isPublishableDecision({ index: 0, relevant: false, category: "government", civicImpact: "high", reasonCode: "GOVERNMENT_POLICY" }), false);
  assert.equal(isPublishableDecision({ index: 0, relevant: true, category: "legislation", civicImpact: "high", reasonCode: "NEW_LEGISLATION" }), true);
}

function testFeedParsing() {
  const now = new Date("2026-09-25T21:00:00Z");
  const mamlaka = `<rss><channel><item><title>مجلس الوزراء يقر مشروع قانون الإدارة المحلية</title><description>قرار تشريعي جديد يؤثر على قواعد الإدارة المحلية في الأردن.</description><link>https://almamlakatv.com/news/210966-</link><pubDate>Fri, 25 Sep 2026 23:30:00 +0300</pubDate></item></channel></rss>`;
  const parsed = parseFeed(mamlaka, now, FEEDS[0]);
  assert.equal(parsed.length, 1, "Al Mamlaka candidate must reach the civic classifier input");
  assert.equal(parsed[0].publisher, "قناة المملكة");
  assert.equal(prefilterCivicNews(parsed[0].title, parsed[0].summary), true);
  assert.equal(parseFeed(mamlaka.replace("https://almamlakatv.com/news", "https://www.almamlakatv.com/news"), now, FEEDS[0]).length, 1);
  const spoofed = mamlaka.replace("almamlakatv.com/news", "almamlakatv.com.evil.test/news");
  assert.equal(parseFeed(spoofed, now, FEEDS[0]).length, 0);
}

testHmac();
testSourceSafety();
testFeedParsing();
testDedupe();
testSchemasAndIndexes();
testSearchPolicy();
testIsolationAndRetentionQueries();
testEditorialRelevance();
console.log("News security and behavior tests passed.");
