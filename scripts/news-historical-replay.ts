import { eventDraftsFromMaterial } from "../src/lib/news/pipelineCore";
import { NEWS_SOURCES, parseGovernmentDetail, type SourceMaterial } from "../src/lib/news/sourceRegistry";
import { load } from "cheerio";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { runNewsDiscovery } from "../src/lib/news/pipeline";
import NewsCandidate from "../src/models/NewsCandidate";
import NewsEvent from "../src/models/NewsEvent";
import NewsItem from "../src/models/NewsItem";

// Editorial reference set sampled across September 2026. The labels refer to
// the article as a whole; the replay reports individual extracted event drafts.
const reference = [
  { sourceId: "prime_ministry", day: "2026-09-09", expected: true, url: "https://pm.gov.jo/Ar/NewsDetails/am0937" },
  { sourceId: "prime_ministry", day: "2026-09-17", expected: true, url: "https://www.pm.gov.jo/Ar/NewsDetails/anews10586" },
  { sourceId: "prime_ministry", day: "2026-09-20", expected: true, url: "https://www.pm.gov.jo/Ar/NewsDetails/anews10594" },
  { sourceId: "prime_ministry", day: "2026-09-27", expected: true, url: "https://www.pm.gov.jo/AR/NewsDetails/anews10595" },
  { sourceId: "prime_ministry", day: "2026-09-28", expected: false, url: "https://www.pm.gov.jo/AR/NewsDetails/am0947" },
  { sourceId: "ministry_of_labour", day: "2026-09-21", expected: true, url: "https://mol.gov.jo/ar/NewsDetails/وزارة_العمل_توضح_آلية_استفادة_المستثمرين_في_المدن_الصناعية_في_معان_والكرك_والطفيلة_من_الحوافز_الحكومية" },
  { sourceId: "ministry_of_labour", day: "2026-09-27", expected: false, url: "https://www.mol.gov.jo/ar/NewsDetails/وزير_العمل_يستقبل_نظيره_المصري_في_عمّان_لبحث_تعزيز_التعاون_العمالي" },
  { sourceId: "ministry_of_labour", day: "2026-09-29", expected: true, url: "https://www.mol.gov.jo/ar/NewsDetails/وزارة_العمل_تضبط_60_عاملاً_وعاملة_منزل_مسجلة_بحقهم_بلاغات_هروب" }
] as const;

async function main() {
  const rows = [];
  const detailPages = new Map<string, string>();
  for (const item of reference) {
    const source = NEWS_SOURCES.find((entry) => entry.id === item.sourceId)!;
    try {
      const response = await fetch(item.url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "NashmiNews-Feasibility/1.0" } });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const html = await response.text();
      detailPages.set(new URL(item.url).toString(), html);
      const $ = load(html);
      const title = $("h1").first().text().replace(/\s+/g, " ").trim() || $("title").text().replace(/\s+/g, " ").trim();
      const paragraphs = parseGovernmentDetail($.html());
      const material: SourceMaterial = { sourceId: source.id, publisher: source.publisher, sourceClass: source.sourceClass, title, summary: paragraphs[0] || title, url: item.url, publishedAt: new Date(`${item.day}T00:00:00+03:00`), datePrecision: "day", paragraphs };
      const now = new Date(material.publishedAt.getTime() + 24 * 60 * 60_000);
      const drafts = eventDraftsFromMaterial(material, now);
      rows.push({ sourceId: item.sourceId, day: item.day, expected: item.expected, url: item.url, title, paragraphs: paragraphs.length, drafts: drafts.map((draft) => ({ title: draft.titleAr, stage: draft.actionStage, eligible: draft.eligible, reason: draft.reason })) });
    } catch (error) { rows.push({ sourceId: item.sourceId, day: item.day, expected: item.expected, url: item.url, error: error instanceof Error ? error.message : "unknown" }); }
  }
  const accessible = rows.filter((row) => "drafts" in row);
  const positives = accessible.filter((row) => row.expected && row.drafts?.some((draft) => draft.eligible)).length;
  const negatives = accessible.filter((row) => !row.expected && !row.drafts?.some((draft) => draft.eligible)).length;
  const db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = db.getUri("nashmi_news_pipeline_test");
  process.env.NEWS_PIPELINE_TEST_DB = "true";
  process.env.NEWS_PIPELINE_MODE = "shadow";
  const replay = [];
  try {
    const days = [...new Set(accessible.map((row) => row.day))].sort();
    const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    for (const day of days) {
      const matching = accessible.filter((row) => row.day === day);
      const read = async (url: string) => {
        const page = detailPages.get(new URL(url).toString());
        if (page) return page;
        const source = NEWS_SOURCES.find((entry) => entry.url === url);
        if (!source) throw new Error("HISTORICAL_SOURCE_UNEXPECTED");
        return matching.filter((row) => row.sourceId === source.id).map((row) => `<a href="${escape(row.url)}"><div class="media news-block"><span class="date">${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}</span><h5 class="card-title">${escape(row.title || "")}</h5><p class="card-text">${escape(row.title || "")}</p></div></a>`).join("");
      };
      const sources = NEWS_SOURCES.filter((source) => source.access === "public_archive" && matching.some((row) => row.sourceId === source.id));
      const now = new Date(new Date(`${day}T00:00:00+03:00`).getTime() + 24 * 60 * 60_000);
      const first = await runNewsDiscovery(now, { sources, read });
      const second = await runNewsDiscovery(now, { sources, read });
      if (second.created !== 0 || second.duplicates !== first.found) throw new Error("HISTORICAL_REPLAY_DUPLICATE_FAILED");
      replay.push({ day, found: first.found, created: first.created, eligible: first.eligible, repeatDuplicates: second.duplicates });
    }
    if (await NewsItem.countDocuments({}) !== 0) throw new Error("HISTORICAL_REPLAY_PUBLISHED_UNEXPECTEDLY");
    console.log(JSON.stringify({ interval: "2026-09-09..2026-09-29", reviewed: rows.length, accessible: accessible.length, expectedPositive: reference.filter((item) => item.expected).length, expectedNegative: reference.filter((item) => !item.expected).length, truePositiveArticles: positives, trueNegativeArticles: negatives, replay, storedCandidates: await NewsCandidate.countDocuments({}), storedEvents: await NewsEvent.countDocuments({}), publicItems: 0, rows }, null, 2));
  } finally { await mongoose.disconnect(); await db.stop(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
