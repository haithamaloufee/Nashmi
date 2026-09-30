import { eventDraftsFromMaterial } from "../src/lib/news/pipelineCore";
import { NEWS_SOURCES, parseGovernmentDetail, type SourceMaterial } from "../src/lib/news/sourceRegistry";
import { load } from "cheerio";

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
  for (const item of reference) {
    const source = NEWS_SOURCES.find((entry) => entry.id === item.sourceId)!;
    try {
      const response = await fetch(item.url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "NashmiNews-Feasibility/1.0" } });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const $ = load(await response.text());
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
  console.log(JSON.stringify({ interval: "2026-09-09..2026-09-29", reviewed: rows.length, accessible: accessible.length, expectedPositive: reference.filter((item) => item.expected).length, expectedNegative: reference.filter((item) => !item.expected).length, truePositiveArticles: positives, trueNegativeArticles: negatives, rows }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
