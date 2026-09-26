import "server-only";

import { GoogleGenAI } from "@google/genai";
import { getRequiredEnv } from "@/lib/env";
import { getNewsConfig } from "@/lib/news/config";
import { dedupeExactFeedItems } from "@/lib/news/dedupe";
import { isObviousNonNashmiNews } from "@/lib/news/editorial";
import { availableFeedLists, FEEDS, parseFeed, type FeedItem } from "@/lib/news/feedParsing";
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

async function selectFeedItems(items: FeedItem[], model: string, maximum: number) {
  const ai = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
  const response = await ai.models.generateContent({
    model,
    contents: `اختر حتى ${maximum} أخبار لمنصة نشمي الأردنية للشأن المدني والسياسي. اختر التطورات المهمة في القوانين والأنظمة وقرارات الحكومة والسياسة العامة والبرلمان والأحزاب والانتخابات والبلديات والقرارات التي تمس المواطنين. ارفض الرياضة والترفيه والجرائم والحوادث والضبط الروتيني والإعلانات والأخبار العامة غير المرتبطة بمهمة نشمي. لا تختر خبرا لمجرد أنه وقع في الأردن. لا تنشئ أخبارا ولا تعِد كتابة النصوص. أعد JSON فقط بالشكل {"selected":[{"index":2,"category":"government"}]}. استخدم الفئات: ${NEWS_CATEGORIES.join(", ")}. الأخبار مرتبة من الأحدث للأقدم: ${JSON.stringify(items.map((item, index) => ({ index, title: item.title, summary: item.summary.slice(0, 320) })))}`,
    config: { responseMimeType: "application/json", maxOutputTokens: 1200, temperature: 0 }
  });
  return parseNewsSelection(JSON.parse(response.text || "{}"), items.length, maximum);
}

export async function discoverJordanNews(now = new Date()) {
  const config = getNewsConfig();
  const feedResults = await Promise.allSettled(FEEDS.map(async (feed) => {
    const xml = await fetchPublisherFeed(feed);
    if (xml.length > 250_000) throw new Error(`NEWS_FEED_${feed.id}_TOO_LARGE`);
    const items = parseFeed(xml, now, feed);
    console.info("feeds_fetched", { source: feed.id, count: items.length });
    return items;
  }));
  feedResults.forEach((result, index) => {
    if (result.status === "rejected") console.warn("feed_unavailable", { source: FEEDS[index].id, reason: result.reason instanceof Error ? result.reason.message.slice(0, 100) : "unknown" });
  });
  const feedLists = availableFeedLists(feedResults);
  const failedSources = FEEDS.filter((_, index) => feedResults[index].status === "rejected").map((feed) => feed.id);
  const parsed = feedLists.flat().sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const nonObvious = parsed.filter((item) => !isObviousNonNashmiNews(item.title));
  const items = dedupeExactFeedItems(nonObvious).slice(0, 40);
  console.info("candidate_count", { parsed: parsed.length, candidates: items.length });

  if (!items.length) {
    console.info("selected_count", { count: 0, model: "none" });
    return {
    candidates: [] as DiscoveredCandidate[], model: "none", queryCount: FEEDS.length,
    diagnostics: { parsed: parsed.length, sourceCounts: Object.fromEntries(FEEDS.map((feed, index) => [feed.id, feedLists[index].length])), failedSources, candidates: 0, selected: 0, excluded: parsed.length }
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
    diagnostics: { parsed: parsed.length, sourceCounts: Object.fromEntries(FEEDS.map((feed, index) => [feed.id, feedLists[index].length])), failedSources, candidates: items.length, selected: candidates.length, excluded: parsed.length - items.length }
  };
}
