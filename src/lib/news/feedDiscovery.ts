import "server-only";

import { GoogleGenAI } from "@google/genai";
import { getRequiredEnv } from "@/lib/env";
import { getNewsConfig } from "@/lib/news/config";
import { dedupeExactFeedItems } from "@/lib/news/dedupe";
import { isObviousNonNashmiNews } from "@/lib/news/editorial";
import { availableFeedLists, FEEDS, parseFeedWithStats, type FeedItem } from "@/lib/news/feedParsing";
import { NEWS_TOPIC_THRESHOLD, scoreNewsTopic, type TopicMatch } from "@/lib/news/topicScoring";
import { assertPublicNewsSourceUrl } from "@/lib/news/security";
import { NEWS_CATEGORIES, type NewsCategory, type NewsSource } from "@/lib/news/types";
import { parseNewsSelection } from "@/lib/news/selection";

const FEED_EDGE_URL = "https://nashmi-news-refresh.hytham-r181.workers.dev/feed";

export type DiscoveredCandidate = {
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  urgency: "normal";
  publishedAt: string;
  sources: NewsSource[];
};

async function fetchPublisherFeed(feed: typeof FEEDS[number]) {
  try {
    const response = await fetch(feed.url, { cache: "no-store", signal: AbortSignal.timeout(7_000) });
    if (response.ok) return await response.text();
  } catch { /* Try the fixed-source Worker once. */ }
  const response = await fetch(`${FEED_EDGE_URL}?source=${feed.id}`, { cache: "no-store", signal: AbortSignal.timeout(7_000) });
  if (!response.ok) throw new Error(`NEWS_FEED_${feed.id}_HTTP_${response.status}`);
  return response.text();
}

type ScoredItem = FeedItem & { topic: TopicMatch };

async function selectFeedItems(items: ScoredItem[], model: string, maximum: number) {
  const ai = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
  const response = await ai.models.generateContent({
    model,
    contents: `أنت المحرر النهائي لأخبار نشمي الأردنية. القائمة مصفاة محلياً للشأن المدني والسياسي، لكن ليست كل العناصر مناسبة للنشر. اختر حتى ${maximum} تطورات مهمة في التشريعات والسياسات الحكومية والبرلمان والأحزاب والانتخابات والحوكمة المحلية والقرارات العامة التي تمس المواطنين. ارفض العمليات الروتينية والزيارات والاحتفالات والتصريحات العامة قليلة القيمة حتى لو ذكرت مؤسسة حكومية. درجة الموضوع مؤشر اكتشاف فقط وليست أمراً بالاختيار. لا تختر خبراً لمجرد أنه وقع في الأردن. لا تنشئ حقائق ولا تعِد كتابة العناوين أو الملخصات. أعد JSON فقط بالشكل {"selected":[{"index":2,"category":"government"}]}. الفئات: ${NEWS_CATEGORIES.join(", ")}. العناصر مرتبة بالصلة ثم الحداثة: ${JSON.stringify(items.map((item, index) => ({ index, title: item.title, summary: item.summary.slice(0, 320), topicScore: item.topic.score, matchedTopics: item.topic.matchedTopics })))}`,
    config: { responseMimeType: "application/json", maxOutputTokens: 1200, temperature: 0 }
  });
  return parseNewsSelection(JSON.parse(response.text || "{}"), items.length, maximum);
}

export async function discoverJordanNews(now = new Date()) {
  const config = getNewsConfig();
  const feedResults = await Promise.allSettled(FEEDS.map(async (feed) => {
    const xml = await fetchPublisherFeed(feed);
    if (xml.length > 750_000) throw new Error(`NEWS_FEED_${feed.id}_TOO_LARGE`);
    const result = parseFeedWithStats(xml, now, feed);
    console.info("feeds_fetched", { source: feed.id, raw: result.rawFeedItems, valid: result.items.length });
    return result;
  }));
  feedResults.forEach((result, index) => {
    if (result.status === "rejected") console.warn("feed_unavailable", { source: FEEDS[index].id, reason: result.reason instanceof Error ? result.reason.message.slice(0, 100) : "unknown" });
  });
  const feedLists = availableFeedLists(feedResults.map((result) => result.status === "fulfilled" ? { status: "fulfilled" as const, value: result.value.items } : result));
  const failedSources = FEEDS.filter((_, index) => feedResults[index].status === "rejected").map((feed) => feed.id);
  const rawFeedItems = feedResults.reduce((total, result) => total + (result.status === "fulfilled" ? result.value.rawFeedItems : 0), 0);
  const afterAgeWindow = feedResults.reduce((total, result) => total + (result.status === "fulfilled" ? result.value.afterAgeWindow : 0), 0);
  const parsed = feedLists.flat();
  const deduped = dedupeExactFeedItems(parsed);
  const afterHardExclusions = deduped.filter((item) => !isObviousNonNashmiNews(item.title));
  const positive = afterHardExclusions.map((item) => ({ ...item, topic: scoreNewsTopic(item.title, item.summary) }))
    .filter((item) => item.topic.score >= NEWS_TOPIC_THRESHOLD);
  const items = positive.sort((a, b) => b.topic.score - a.topic.score || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 25);
  const diagnostics = {
    rawFeedItems, afterAgeWindow, afterExactDedupe: deduped.length,
    afterHardExclusions: afterHardExclusions.length, positiveTopicMatches: positive.length,
    geminiInputCount: items.length, selectedCount: 0,
    sourceCounts: Object.fromEntries(FEEDS.map((feed, index) => [feed.id, feedLists[index].length])),
    publisherRaw: Object.fromEntries(FEEDS.map((feed, index) => [feed.id, feedResults[index].status === "fulfilled" ? feedResults[index].value.rawFeedItems : 0])),
    publisherTopicMatches: Object.fromEntries(FEEDS.map((feed) => [feed.id, positive.filter((item) => item.sourceId === feed.id).length])),
    failedSources, parsed: parsed.length, candidates: items.length, selected: 0,
    excluded: parsed.length - items.length
  };
  console.info("news_discovery_funnel", diagnostics);

  if (!items.length) {
    console.info("selected_count", { count: 0, model: "none" });
    return {
    candidates: [] as DiscoveredCandidate[], model: "none", queryCount: FEEDS.length,
    diagnostics
  };
  }

  let selected: Awaited<ReturnType<typeof selectFeedItems>>;
  let usedModel = config.discoveryModel;
  try {
    selected = await selectFeedItems(items, usedModel, config.maxNewItems);
  } catch (primaryError) {
    if (config.discoveryFallbackModel === usedModel) throw primaryError;
    usedModel = config.discoveryFallbackModel;
    selected = await selectFeedItems(items, usedModel, config.maxNewItems);
  }
  console.info("selected_count", { count: selected.length, model: usedModel });

  const candidates: DiscoveredCandidate[] = [];
  for (const decision of selected) {
    const item = items[decision.index];
    await assertPublicNewsSourceUrl(item.url);
    candidates.push({
      titleAr: item.title,
      summaryAr: item.summary,
      category: decision.category,
      urgency: "normal",
      publishedAt: item.publishedAt,
      sources: [{ title: item.title, url: item.url, publisher: item.publisher, sourceClass: "reputable_media" }]
    });
  }
  return {
    candidates,
    model: usedModel,
    queryCount: FEEDS.length,
    diagnostics: { ...diagnostics, selectedCount: candidates.length, selected: candidates.length }
  };
}
