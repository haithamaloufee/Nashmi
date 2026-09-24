import "server-only";

import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { getRequiredEnv } from "@/lib/env";
import { getNewsConfig } from "@/lib/news/config";
import { LEGISLATIVE_STAGES, NEWS_CATEGORIES, type NewsSource } from "@/lib/news/types";
import { classifyNewsSource, resolveGroundedSourceUrl } from "@/lib/news/security";
import { normalizeArabic } from "@/lib/arabicSearch";
import { classifyAiProviderError } from "@/lib/ai/resilience";
import { isNashmiRelevant } from "@/lib/news/relevance";

const CandidateSchema = z.object({
  titleAr: z.string().trim().min(12).max(180),
  summaryAr: z.string().trim().min(30).max(900),
  category: z.enum(NEWS_CATEGORIES),
  urgency: z.enum(["normal", "breaking"]),
  publishedAt: z.string().datetime({ offset: true }),
  legislativeStage: z.enum(LEGISLATIVE_STAGES).nullable(),
  jordanRelevance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  nashmiRelevant: z.boolean(),
  relevanceReason: z.string().trim().min(12).max(400),
  civicImpact: z.enum(["low", "medium", "high"])
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
        required: ["titleAr", "summaryAr", "category", "urgency", "publishedAt", "legislativeStage", "jordanRelevance", "confidence", "nashmiRelevant", "relevanceReason", "civicImpact"],
        properties: {
          titleAr: { type: "string", minLength: 12, maxLength: 180 },
          summaryAr: { type: "string", minLength: 30, maxLength: 900 },
          category: { type: "string", enum: NEWS_CATEGORIES },
          urgency: { type: "string", enum: ["normal", "breaking"] },
          publishedAt: { type: "string", format: "date-time" },
          legislativeStage: { anyOf: [{ type: "string", enum: LEGISLATIVE_STAGES }, { type: "null" }] },
          jordanRelevance: { type: "number", minimum: 0, maximum: 1 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          nashmiRelevant: { type: "boolean" },
          relevanceReason: { type: "string", minLength: 12, maxLength: 400 },
          civicImpact: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    }
  }
};

const FALLBACK_RESPONSE_SCHEMA = {
  type: "object",
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        required: ["titleAr", "summaryAr", "category", "urgency", "publishedAt", "legislativeStage", "jordanRelevance", "confidence", "nashmiRelevant", "relevanceReason", "civicImpact"],
        properties: {
          titleAr: { type: "string" },
          summaryAr: { type: "string" },
          category: { type: "string" },
          urgency: { type: "string" },
          publishedAt: { type: "string" },
          legislativeStage: { anyOf: [{ type: "string" }, { type: "null" }] },
          jordanRelevance: { type: "number" },
          confidence: { type: "number" },
          nashmiRelevant: { type: "boolean" },
          relevanceReason: { type: "string" },
          civicImpact: { type: "string" }
        }
      }
    }
  }
};

const DISCOVERY_PROMPT = `
ابحث في الويب عن مستجدات حديثة وموثقة في الأردن تخص التشريعات، سياسة الحكومة، البرلمان، الأحزاب، الانتخابات، الإصلاح السياسي، القرارات المدنية الكبرى أو التغييرات المهمة في السياسات العامة التي ينبغي للمواطن فهمها، والمنشورة خلال آخر 24 ساعة فقط. نشمي ليست خدمة أخبار عامة.

قيّم الحدث نفسه لا فئة الخبر وحدها. قرارات الخدمات والتعليم والنقل والبلديات تُقبل عند تغيير سياسة أو قاعدة تمس شريحة واسعة. تبقى إجراءات العمل التشريعي والسياسي مهمة ولو كان أثرها اليومي المباشر منخفضاً.

قواعد إلزامية:
- يجب أن تستخدم أداة Google Search فعلياً في هذه العملية؛ لا تعتمد على الذاكرة. ابدأ ببحث مؤرخ لليوم الحالي في المصادر المذكورة أدناه. إذا لم تنفذ الأداة بحثاً، أعد candidates فارغة.
- الأردن هو محور الخبر بوضوح، وليس مجرد ذكر عابر.
- أعطِ الأولوية للتغطية اليومية في المملكة almamlaka.tv، رؤيا royanews.tv، الغد alghad.com، الرأي alrai.com، الدستور addustour.com، Jordan Times وJordan News، ثم طابق الادعاءات المهمة مع المصدر الرسمي المختص.
- افحص المصادر الرسمية الأردنية بحسب موضوع الخبر: رئاسة الوزراء pm.gov.jo، مجلس النواب representatives.jo، مجلس الأعيان senate.jo، الديوان الملكي rhc.jo، الهيئة المستقلة للانتخاب iec.jo، مؤسسة الإذاعة والتلفزيون الأردني jrtv.gov.jo، وبقية المواقع الحكومية المنتهية بـ gov.jo.
- استخدم وكالة الأنباء الأردنية بترا petra.gov.jo كمصدر موثوق ضمن المزيج، لا كمصدر وحيد أو مهيمن إذا توفرت تغطية حديثة من المؤسسات الإعلامية السابقة.
- يمكن استخدام الموضوعات والوسوم المتداولة في الأردن على X وفيسبوك ومؤشرات Google كإشارات لاكتشاف ما يهم الناس، لكن لا تنشر الإشارة نفسها. ابحث عن أصلها ثم لا تُرجعها إلا بعد توثيقها من موقع رسمي أو مؤسستين إعلاميتين موثوقتين.
- يمكن الاستفادة من الحسابات الرسمية الموثقة على فيسبوك أو المنصات الاجتماعية لاكتشاف الحدث فقط، لكن لا تُرجع خبراً إلا إذا وُجد له رابط أصلي في موقع رسمي أو موقع إعلامي أردني موثوق مسموح.
- لا تقبل منشور شبكة اجتماعية كمصدر نهائي، ولا رأياً أو شائعة أو خبرًا بلا تاريخ ووقت نشر واضحين.
- استبعد أخبار الجرائم والحوادث العادية، مصادرة السلع والإطارات، التفتيش وضبط اعتداءات المياه والكهرباء الفردية، الأسعار والذهب والطقس والرياضة والترفيه، التدريب الروتيني، الزيارات الاحتفالية، مذكرات التفاهم والنشاطات المؤسسية الصغيرة، إلا عند نشوء تغيير كبير وموثق في السياسة العامة.
- الخبر الملكي يحتاج صلة حقيقية بسياسة الأردن أو الحكومة أو الإصلاح أو تشريع أو دبلوماسية ذات أهمية وطنية واضحة. مجرد حضور أو لقاء بروتوكولي لا يكفي.
- لكل مرشح أرجع nashmiRelevant بقيمة true فقط إذا اجتاز نطاق نشمي، وrelevanceReason يشرح القرار بإيجاز، وcivicImpact بقيمة low أو medium أو high. لا ترفع الأثر لتجاوز الفلتر.
- publishedAt هو وقت النشر الظاهر في صفحة المصدر نفسها محولاً إلى ISO 8601 مع المنطقة الزمنية. لا تخمّن وقتاً ولا تستخدم وقت منتصف الليل كقيمة افتراضية.
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

function sanitizeJsonControlCharacters(value: string) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (inString && character.charCodeAt(0) < 0x20) {
      result += " ";
      escaped = false;
      continue;
    }
    result += character;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') inString = !inString;
  }
  return result;
}

function firstJsonObject(value: string) {
  const start = value.indexOf("{");
  if (start < 0) return value;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }
  return value.slice(start);
}

function parseDiscoveryPayload(text: string | undefined) {
  const raw = (text || "").trim();
  const unfenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const json = firstJsonObject(unfenced);
  return DiscoverySchema.parse(JSON.parse(sanitizeJsonControlCharacters(json || "{}")));
}

function isRecoverableDiscoveryError(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: number }).status) : null;
  return [429, 500, 502, 503, 504].includes(status || 0) || classifyAiProviderError(error).retryable || error instanceof SyntaxError || error instanceof z.ZodError;
}

async function retryTransientDiscovery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isRecoverableDiscoveryError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    return operation();
  }
}

async function requestDiscovery(client: GoogleGenAI, model: string, now: Date, structuredOutput: boolean) {
  const config = {
    tools: [{ googleSearch: {} }],
    temperature: 0.1,
    maxOutputTokens: 8_192,
    ...(structuredOutput ? { responseMimeType: "application/json", responseJsonSchema: RESPONSE_SCHEMA } : {})
  };
  return retryTransientDiscovery(() => client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: `${DISCOVERY_PROMPT}\n\nوقت التنفيذ (UTC): ${now.toISOString()}` }] }],
    config
  }));
}

async function normalizeFallbackDiscovery(client: GoogleGenAI, model: string, rawText: string | undefined) {
  return retryTransientDiscovery(() => client.models.generateContent({
    model,
    contents: [{
      role: "user",
      parts: [{
        text: [
          "حوّل بيانات الاكتشاف التالية إلى JSON صالح يطابق المخطط المطلوب حرفيًا. إذا كانت البيانات تحتوي JSON غير مكتمل أو علامات اقتباس غير صالحة، أصلح صياغة JSON دون اختراع أخبار أو وقائع.",
          "حافظ على كل مرشح موجود لديه عنوان وملخص ووقت نشر؛ لا تضف خبراً أو حقيقة غير موجودة في البيانات.",
          `category يجب أن تكون واحدة من: ${NEWS_CATEGORIES.join(", ")}. حوّل المرادفات إلى أقرب فئة مسموحة.`,
          "urgency يجب أن تكون normal أو breaking، واستخدم normal افتراضيًا.",
          `legislativeStage يجب أن تكون null أو واحدة من: ${LEGISLATIVE_STAGES.join(", ")}. استخدم null إذا لم تكن المرحلة مؤكدة.`,
          "publishedAt يجب أن يكون ISO 8601 مع منطقة زمنية مع الحفاظ على التاريخ والوقت الواردين.",
          "jordanRelevance وconfidence رقمان بين 0 و1؛ حافظ على القيم الواردة ولا ترفعها.",
          "nashmiRelevant قيمة boolean وrelevanceReason سبب الملاءمة وcivicImpact واحدة من low أو medium أو high؛ حافظ على التقييم الوارد ولا تحول مرشحاً غير مناسب إلى مناسب.",
          "احذف المرشح فقط إذا كان العنوان أو الملخص أو وقت النشر مفقودًا بالكامل.",
          "أعد JSON فقط.",
          "",
          rawText || ""
        ].join("\n")
      }]
    }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: FALLBACK_RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 8_192
    }
  }));
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

export async function discoverJordanNews(now = new Date()): Promise<{ candidates: DiscoveredCandidate[]; model: string; queryCount: number; diagnostics: Record<string, number> }> {
  const config = getNewsConfig();
  const client = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
  let model = config.discoveryModel;
  let response: GenerateContentResponse;
  let parsed: z.infer<typeof DiscoverySchema>;
  try {
    response = await requestDiscovery(client, model, now, true);
    parsed = parseDiscoveryPayload(response.text);
  } catch (error) {
    if (!isRecoverableDiscoveryError(error) || config.discoveryFallbackModel === model) throw error;
    model = config.discoveryFallbackModel;
    // Gemini 2.5 search grounding does not support responseMimeType/json-schema
    // together. Keep the grounded response for citation mapping, then make one
    // bounded no-search normalization call and validate that result below.
    response = await requestDiscovery(client, model, now, false);
    const normalized = await normalizeFallbackDiscovery(client, model, response.text);
    try {
      parsed = parseDiscoveryPayload(normalized.text);
    } catch {
      // Grounded Gemini 2.5 output occasionally contains incomplete JSON. One
      // bounded repair pass uses the same grounded text and never adds facts.
      const repaired = await normalizeFallbackDiscovery(client, model, normalized.text);
      parsed = parseDiscoveryPayload(repaired.text);
    }
  }
  const oldestAllowed = now.getTime() - 30 * 60 * 60 * 1000;
  const newestAllowed = now.getTime() + 30 * 60 * 1000;
  const candidates: DiscoveredCandidate[] = [];
  const diagnostics = {
    parsed: parsed.candidates.length,
    irrelevant: 0,
    invalidTime: 0,
    belowThreshold: 0,
    editorial: 0,
    noValidatedSource: 0,
    missingOfficialSource: 0,
    accepted: 0
  };

  for (const [index, candidate] of parsed.candidates.entries()) {
    if (!isNashmiRelevant(candidate)) {
      console.info(JSON.stringify({ level: "info", event: "news.discovery_relevance_rejected", titleAr: candidate.titleAr.slice(0, 180) }));
      diagnostics.irrelevant += 1;
      continue;
    }
    const publishedAt = new Date(candidate.publishedAt).getTime();
    if (publishedAt < oldestAllowed || publishedAt > newestAllowed) {
      diagnostics.invalidTime += 1;
      continue;
    }
    if (candidate.confidence < config.minConfidence || candidate.jordanRelevance < config.minJordanRelevance) {
      diagnostics.belowThreshold += 1;
      continue;
    }
    if (!passesEditorialChecks(candidate)) {
      diagnostics.editorial += 1;
      continue;
    }
    const sources = await sourcesForCandidate(response, candidate, index);
    if (!sources.length) {
      diagnostics.noValidatedSource += 1;
      continue;
    }
    if (["legislation", "elections"].includes(candidate.category) && !sources.some((source) => source.sourceClass === "official")) {
      diagnostics.missingOfficialSource += 1;
      continue;
    }
    candidates.push({ ...candidate, sources });
    diagnostics.accepted += 1;
  }

  console.info(JSON.stringify({ level: "info", event: "news.discovery_validation", model, ...diagnostics }));

  return {
    candidates: candidates.slice(0, config.maxNewItems),
    model,
    queryCount: response.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0,
    diagnostics
  };
}
