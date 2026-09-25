import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getRequiredEnv } from "@/lib/env";
import { getNewsConfig } from "@/lib/news/config";
import { classifyNewsSource, assertPublicNewsSourceUrl } from "@/lib/news/security";
import { NEWS_CATEGORIES, type NewsCategory, type NewsSource } from "@/lib/news/types";

const FEED_URL = "https://almamlakatv.com/rss.xml";
const FEED_EDGE_URL = "https://nashmi-news-refresh.hytham-r181.workers.dev/feed";
const PUBLISHER = "قناة المملكة";
const FeedDecisionSchema = z.object({
  items: z.array(z.object({
    index: z.number().int().min(0),
    relevant: z.boolean(),
    category: z.enum(NEWS_CATEGORIES),
  })).max(10),
});

type FeedItem = { title: string; summary: string; url: string; publishedAt: string };

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
  civicImpact: "medium";
  sources: NewsSource[];
};

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function feedField(item: string, name: string) {
  return item.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() || "";
}

function parseFeed(xml: string, now: Date) {
  const items: FeedItem[] = [];
  // This publisher's feed occasionally has non-standard whitespace, so read item
  // fields conservatively rather than relying on the entire document being valid XML.
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const raw = match[1];
    const title = cleanText(feedField(raw, "title"));
    const summary = cleanText(feedField(raw, "description"));
    const url = feedField(raw, "link");
    const timestamp = Date.parse(feedField(raw, "pubDate"));
    if (title.length < 12 || summary.length < 30 || !Number.isFinite(timestamp)) continue;
    if (timestamp > now.getTime() + 10 * 60_000 || timestamp < now.getTime() - 30 * 60 * 60_000) continue;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname !== "almamlakatv.com" || !/^\/news\/\d+-?$/.test(parsedUrl.pathname)) continue;
      if (classifyNewsSource(url) !== "reputable_media") continue;
    } catch { continue; }
    items.push({ title: title.slice(0, 180), summary: summary.slice(0, 900), url, publishedAt: new Date(timestamp).toISOString() });
  }
  return items.slice(0, 10);
}

function fallbackRelevant(item: FeedItem) {
  return /الأردن|الأردني|الأردنية|عمّان|عمان|العقبة|الصفدي|مجلس النواب|رئيس الوزراء|الحكومة الأردنية|وزارة (الصحة|التربية|التعليم|النقل|العمل|الداخلية|الخارجية)|البنك المركزي الأردني/.test(`${item.title} ${item.summary}`);
}

async function classifyFeed(items: FeedItem[], model: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
    const response = await ai.models.generateContent({
      model,
      contents: `صنّف عناصر خلاصة قناة المملكة التالية. اختر relevant=true فقط للخبر الذي يتمحور حول الأردن أو يؤثر على مواطنيه مباشرة. استبعد الرياضة والترفيه والعالم بلا صلة واضحة بالأردن. لا تؤلف أي خبر ولا تغير عنوانه أو ملخصه أو رابطه. أعد JSON فقط: {"items":[{"index":0,"relevant":true,"category":"government"}]}، واستخدم إحدى الفئات: ${NEWS_CATEGORIES.join(", ")}. العناصر: ${JSON.stringify(items.map((item, index) => ({ index, title: item.title, summary: item.summary })))}`,
      config: { responseMimeType: "application/json", maxOutputTokens: 1500, temperature: 0 },
    });
    const parsed = FeedDecisionSchema.parse(JSON.parse(response.text || "{}"));
    return new Map(parsed.items.map((item) => [item.index, item]));
  } catch (error) {
    console.warn("news.feed_classification_fallback", { reason: error instanceof Error ? error.message.slice(0, 160) : "unknown" });
    return null;
  }
}

export async function discoverJordanNews(now = new Date()) {
  let response = await fetch(FEED_URL, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) response = await fetch(FEED_EDGE_URL, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`NEWS_FEED_HTTP_${response.status}`);
  const xml = await response.text();
  if (xml.length > 250_000) throw new Error("NEWS_FEED_TOO_LARGE");
  const items = parseFeed(xml, now);
  const config = getNewsConfig();
  const decisions = items.length ? await classifyFeed(items, config.discoveryModel) : null;
  const candidates: DiscoveredCandidate[] = [];
  for (const [index, item] of items.entries()) {
    const decision = decisions?.get(index);
    // Keep the publisher's original title, summary, date and link. The AI can
    // only classify; a conservative keyword fallback keeps refreshes functional.
    if (!decision?.relevant && !fallbackRelevant(item)) continue;
    await assertPublicNewsSourceUrl(item.url);
    candidates.push({
      titleAr: item.title,
      summaryAr: item.summary,
      category: decision?.category || "civic",
      urgency: "normal",
      publishedAt: item.publishedAt,
      legislativeStage: null,
      jordanRelevance: 0.9,
      confidence: 0.9,
      nashmiRelevant: true,
      relevanceReason: "خبر أردني حديث منشور مباشرة في موقع قناة المملكة الإخبارية.",
      civicImpact: "medium",
      sources: [{ title: item.title, url: item.url, publisher: PUBLISHER, sourceClass: "reputable_media" }],
    });
    if (candidates.length >= config.maxNewItems) break;
  }
  return {
    candidates,
    model: decisions ? config.discoveryModel : "publisher-rss-fallback",
    queryCount: 1,
    diagnostics: { parsed: items.length, accepted: candidates.length, irrelevant: items.length - candidates.length, invalidTime: 0, belowThreshold: 0, editorial: 0, noValidatedSource: 0, missingOfficialSource: 0 },
  };
}
