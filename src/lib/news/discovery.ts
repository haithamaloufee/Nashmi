import "server-only";

import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { getRequiredEnv } from "@/lib/env";
import { getNewsConfig } from "@/lib/news/config";
import { LEGISLATIVE_STAGES, NEWS_CATEGORIES, type NewsSource } from "@/lib/news/types";
import { classifyNewsSource, resolveGroundedSourceUrl } from "@/lib/news/security";
import { normalizeArabic } from "@/lib/arabicSearch";

const CandidateSchema = z.object({
  titleAr: z.string().trim().min(12).max(180),
  summaryAr: z.string().trim().min(30).max(900),
  category: z.enum(NEWS_CATEGORIES),
  urgency: z.enum(["normal", "breaking"]),
  publishedAt: z.string().datetime({ offset: true }),
  legislativeStage: z.enum(LEGISLATIVE_STAGES).nullable(),
  jordanRelevance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1)
});

const DiscoverySchema = z.object({ candidates: z.array(CandidateSchema).max(15) });

export type DiscoveredCandidate = z.infer<typeof CandidateSchema> & { sources: NewsSource[] };

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titleAr", "summaryAr", "category", "urgency", "publishedAt", "legislativeStage", "jordanRelevance", "confidence"],
        properties: {
          titleAr: { type: "string", minLength: 12, maxLength: 180 },
          summaryAr: { type: "string", minLength: 30, maxLength: 900 },
          category: { type: "string", enum: NEWS_CATEGORIES },
          urgency: { type: "string", enum: ["normal", "breaking"] },
          publishedAt: { type: "string", format: "date-time" },
          legislativeStage: { anyOf: [{ type: "string", enum: LEGISLATIVE_STAGES }, { type: "null" }] },
          jordanRelevance: { type: "number", minimum: 0, maximum: 1 },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    }
  }
};

const DISCOVERY_PROMPT = `
ابحث في الويب عن أهم المستجدات الأردنية المدنية والسياسية والخدمية المنشورة خلال آخر 24 ساعة فقط.

الموضوعات المسموحة حصراً: التشريعات، الحكومة، مجلس الأمة، الأحزاب الأردنية، الانتخابات، البلديات، الخدمات العامة، التعليم، النقل، والمشاركة المدنية.

قواعد إلزامية:
- الأردن هو محور الخبر بوضوح، وليس مجرد ذكر عابر.
- استخدم المصادر الرسمية أولاً، ثم وكالة الأنباء الأردنية بترا، ثم وسائل إعلام أردنية موثوقة فقط.
- لا تقبل منشورات شبكات اجتماعية أو رأياً أو شائعة أو خبرًا بلا تاريخ واضح.
- لا تنقل ادعاءً لا يسنده مصدر من نتائج Google Search.
- العنوان عربي محايد وواضح، بلا إثارة أو سؤال أو توجيه سياسي.
- الملخص عربي واقعي من جملتين أو ثلاث، بلا تحليل أو تأييد.
- urgency تكون breaking فقط لقرار رسمي عاجل أو حدث عام كبير جارٍ الآن.
- legislativeStage يعبأ فقط عند وجود مرحلة تشريعية مؤكدة، وإلا null.
- لا تكرر الحدث نفسه بصياغات مختلفة.
- أعد بحد أقصى 12 مرشحاً مرتبة حسب الأهمية العامة والثقة.
- أعد JSON فقط وفق المخطط المطلوب.
`.trim();

const SENSATIONAL_TERMS = ["صادم", "كارثي", "يفضح", "فضيحة", "انتصار ساحق", "هزيمة", "لن تصدق"];

function passesEditorialChecks(candidate: z.infer<typeof CandidateSchema>) {
  const title = normalizeArabic(candidate.titleAr);
  const arabicCharacters = (candidate.titleAr.match(/[\u0600-\u06ff]/g) || []).length;
  const letterCharacters = (candidate.titleAr.match(/\p{L}/gu) || []).length;
  if (/[!?؟]/.test(candidate.titleAr) || SENSATIONAL_TERMS.some((term) => title.includes(normalizeArabic(term)))) return false;
  if (!letterCharacters || arabicCharacters / letterCharacters < 0.7) return false;
  if (candidate.urgency === "breaking" && candidate.confidence < 0.85) return false;
  return true;
}

function extractGrounding(response: GenerateContentResponse) {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks || [];
  const supports = metadata?.groundingSupports || [];
  return { chunks, supports };
}

function candidateChunkIndexes(response: GenerateContentResponse, candidate: z.infer<typeof CandidateSchema>, candidateIndex: number) {
  const { chunks, supports } = extractGrounding(response);
  const normalizedTitle = normalizeArabic(candidate.titleAr);
  const words = normalizedTitle.split(" ").filter((word) => word.length > 2);
  const matched = new Set<number>();
  for (const support of supports) {
    const text = normalizeArabic(support.segment?.text || "");
    const overlap = words.filter((word) => text.includes(word)).length;
    if (text.includes(normalizedTitle) || overlap >= Math.min(3, Math.max(2, Math.ceil(words.length / 3)))) {
      for (const index of support.groundingChunkIndices || []) matched.add(index);
    }
  }
  if (!matched.size && chunks.length === 1 && candidateIndex === 0) matched.add(0);
  return [...matched].filter((index) => chunks[index]?.web?.uri).slice(0, 4);
}

async function sourcesForCandidate(response: GenerateContentResponse, candidate: z.infer<typeof CandidateSchema>, candidateIndex: number): Promise<NewsSource[]> {
  const { chunks } = extractGrounding(response);
  const indexes = candidateChunkIndexes(response, candidate, candidateIndex);
  const sources: NewsSource[] = [];
  const seen = new Set<string>();
  for (const index of indexes) {
    const web = chunks[index]?.web;
    if (!web?.uri) continue;
    try {
      const resolved = await resolveGroundedSourceUrl(web.uri);
      const sourceClass = classifyNewsSource(resolved);
      if (!sourceClass || seen.has(resolved)) continue;
      const hostname = new URL(resolved).hostname.replace(/^www\./, "");
      seen.add(resolved);
      sources.push({ title: (web.title || hostname).slice(0, 240), url: resolved, publisher: hostname.slice(0, 160), sourceClass });
    } catch {
      // A candidate without at least one fully validated grounded source is rejected below.
    }
  }
  return sources;
}

export async function discoverJordanNews(now = new Date()): Promise<{ candidates: DiscoveredCandidate[]; model: string; queryCount: number }> {
  const config = getNewsConfig();
  const client = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
  const response = await client.models.generateContent({
    model: config.discoveryModel,
    contents: [{ role: "user", parts: [{ text: `${DISCOVERY_PROMPT}\n\nوقت التنفيذ (UTC): ${now.toISOString()}` }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 4_096
    }
  });

  const parsed = DiscoverySchema.parse(JSON.parse(response.text || "{}"));
  const oldestAllowed = now.getTime() - 30 * 60 * 60 * 1000;
  const newestAllowed = now.getTime() + 30 * 60 * 1000;
  const candidates: DiscoveredCandidate[] = [];

  for (const [index, candidate] of parsed.candidates.entries()) {
    const publishedAt = new Date(candidate.publishedAt).getTime();
    if (publishedAt < oldestAllowed || publishedAt > newestAllowed) continue;
    if (candidate.confidence < config.minConfidence || candidate.jordanRelevance < config.minJordanRelevance) continue;
    if (!passesEditorialChecks(candidate)) continue;
    const sources = await sourcesForCandidate(response, candidate, index);
    if (!sources.length) continue;
    if (["legislation", "elections"].includes(candidate.category) && !sources.some((source) => source.sourceClass === "official")) continue;
    candidates.push({ ...candidate, sources });
  }

  return {
    candidates: candidates.slice(0, config.maxNewItems),
    model: config.discoveryModel,
    queryCount: response.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0
  };
}
