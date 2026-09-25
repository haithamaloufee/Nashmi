import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getRequiredEnv } from "@/lib/env";
import { getNewsConfig } from "@/lib/news/config";
import { assertPublicNewsSourceUrl } from "@/lib/news/security";
import { NEWS_CATEGORIES, type NewsCategory, type NewsSource } from "@/lib/news/types";
import { NEWS_REASON_CODES, isPublishableDecision, obviousCivicDecision, prefilterCivicNews, type NewsDecision } from "@/lib/news/editorial";
import { FEEDS, parseFeed, type FeedItem } from "@/lib/news/feedParsing";

const FEED_EDGE_URL = "https://nashmi-news-refresh.hytham-r181.workers.dev/feed";
const FeedDecisionSchema = z.object({
  items: z.array(z.object({
    index: z.number().int().min(0),
    relevant: z.boolean(),
    category: z.enum(NEWS_CATEGORIES),
    civicImpact: z.enum(["low", "medium", "high"]),
    reasonCode: z.enum(NEWS_REASON_CODES),
  })).max(20),
});

export type DiscoveredCandidate = {
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  urgency: "normal" | "breaking";
  publishedAt: string;
  legislativeStage: null;
  jordanRelevance: number;
  confidence: number;
  nashmiRelevant: boolean;
  relevanceReason: string;
  civicImpact: "medium" | "high";
  sources: NewsSource[];
};

async function fetchPublisherFeed(feed: typeof FEEDS[number]) {
  try {
    const response = await fetch(feed.url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (response.ok) return await response.text();
  } catch { /* Edge fallback handles blocked publisher egress and timeouts. */ }
  const response = await fetch(`${FEED_EDGE_URL}?source=${feed.id}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`NEWS_FEED_${feed.id}_HTTP_${response.status}`);
  return response.text();
}

function isPromotional(item: FeedItem) {
  return /الراعي (البلاتيني|الذهبي|الفضي)|مزوّد .* الحصري|يرعى .* (مؤتمر|مهرجان)|شركة .* تعلن عن (عروض|خدمات)/.test(item.title);
}

async function classifyFeed(items: FeedItem[], model: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
    const response = await ai.models.generateContent({
      model,
      contents: `أنت محرر منصة نشمي الأردنية للشؤون السياسية والتشريعية والمدنية. صنّف كل عنصر على حدة. relevant=true فقط لتطور جديد ومهم في تشريع أردني أو سياسة حكومية عامة أو البرلمان أو الأحزاب أو الانتخابات أو إصلاح سياسي أو قرار محلي تنظيمي واسع الأثر. مجرد وقوع الخبر في الأردن أو ذكر وزارة أو جهة رسمية لا يكفي. ارفض الضبط والتفتيش الروتيني والجرائم والحوادث والطقس والرياضة والترفيه والإعلانات واستطلاعات الناشر واللقاءات والورش المعتادة. لا تُنشئ خبراً ولا تغيّر الوقائع. أعد لكل index قراراً واحداً؛ إن شككت فاجعل relevant=false وreasonCode=NOT_RELEVANT. JSON فقط بالصيغة {"items":[{"index":0,"relevant":true,"category":"legislation","civicImpact":"high","reasonCode":"NEW_LEGISLATION"}]}. category من ${NEWS_CATEGORIES.join(", ")}. reasonCode من ${NEWS_REASON_CODES.join(", ")}. العناصر: ${JSON.stringify(items.map((item, index) => ({ index, title: item.title, summary: item.summary })))}`,
      config: { responseMimeType: "application/json", maxOutputTokens: 4000, temperature: 0 },
    });
    const parsed = FeedDecisionSchema.parse(JSON.parse(response.text || "{}"));
    return new Map<number, NewsDecision>(parsed.items.filter((item) => item.index < items.length).map((item) => [item.index, item]));
  } catch (error) {
    console.warn("news.feed_classification_fallback", { reason: error instanceof Error ? error.message.slice(0, 160) : "unknown" });
    return null;
  }
}

export async function discoverJordanNews(now = new Date()) {
  const results = await Promise.allSettled(FEEDS.map(async (feed) => {
    const xml = await fetchPublisherFeed(feed);
    if (xml.length > 250_000) throw new Error(`NEWS_FEED_${feed.id}_TOO_LARGE`);
    return parseFeed(xml, now, feed);
  }));
  const sourceCounts = Object.fromEntries(FEEDS.map((feed, index) => [feed.id, results[index].status === "fulfilled" ? results[index].value.length : 0]));
  const parsedItems = results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const config = getNewsConfig();
  const items = parsedItems.filter((item) =>
    Date.parse(item.publishedAt) >= now.getTime() - config.activeHours * 60 * 60_000 &&
    prefilterCivicNews(item.title, item.summary) && !isPromotional(item)
  ).slice(0, 20);
  if (!items.length && results.every((result) => result.status === "rejected")) {
    throw new Error(`NEWS_FEEDS_UNAVAILABLE: ${results.map((result) => result.status === "rejected" ? String(result.reason).slice(0, 80) : "ok").join("; ")}`);
  }
  let decisions = items.length ? await classifyFeed(items, config.discoveryModel) : null;
  let usedModel = config.discoveryModel;
  if (!decisions && items.length && config.discoveryFallbackModel !== config.discoveryModel) {
    decisions = await classifyFeed(items, config.discoveryFallbackModel);
    usedModel = config.discoveryFallbackModel;
  }
  const candidates: DiscoveredCandidate[] = [];
  let editorial = 0;
  let noValidatedSource = 0;
  for (const [index, item] of items.entries()) {
    const decision = decisions ? decisions.get(index) : obviousCivicDecision(item.title, item.summary, index);
    if (!isPublishableDecision(decision)) { editorial += 1; continue; }
    try { await assertPublicNewsSourceUrl(item.url); } catch { noValidatedSource += 1; continue; }
    candidates.push({
      titleAr: item.title,
      summaryAr: item.summary,
      category: decision!.category,
      urgency: "normal",
      publishedAt: item.publishedAt,
      legislativeStage: null,
      jordanRelevance: 0.9,
      confidence: decisions ? 0.85 : 0.75,
      nashmiRelevant: true,
      relevanceReason: `${decision!.reasonCode}: تطور في الشأن العام الأردني نشره ${item.publisher}.`,
      civicImpact: decision!.civicImpact as "medium" | "high",
      sources: [{ title: item.title, url: item.url, publisher: item.publisher, sourceClass: "reputable_media" }],
    });
    if (candidates.length >= config.maxNewItems) break;
  }
  return {
    candidates,
    model: decisions ? usedModel : "strict-deterministic-fallback",
    queryCount: FEEDS.length,
    diagnostics: { parsed: parsedItems.length, sourceCounts, prefiltered: items.length, accepted: candidates.length, irrelevant: parsedItems.length - items.length, invalidTime: 0, belowThreshold: 0, editorial, noValidatedSource, missingOfficialSource: 0 },
  };
}
