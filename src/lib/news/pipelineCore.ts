import { normalizeArabic } from "@/lib/arabicSearch";
import { sha256 } from "@/lib/news/dedupe";
import { isObviousNonNashmiNews } from "@/lib/news/editorial";
import { scoreNewsTopic } from "@/lib/news/topicScoring";
import { sourceById, type SourceMaterial } from "@/lib/news/sourceRegistry";
import type { NewsCategory } from "@/lib/news/types";
import type { NEWS_ACTION_STAGES } from "@/models/NewsEvent";
import { classifyPublicActivity, type EventKind, type EventStatus } from "@/lib/news/activityClassification";

export type ActionStage = (typeof NEWS_ACTION_STAGES)[number];
export type EventDraft = {
  eventKey: string;
  titleAr: string;
  summaryAr: string;
  passage: string;
  category: NewsCategory;
  authority: string;
  actionStage: ActionStage;
  verification: "official" | "reported" | "unclear";
  publishedAt: Date;
  eligible: boolean;
  reason: string | null;
  scopeSupported: boolean;
  eventKind: EventKind;
  eventStatus: EventStatus;
  scheduledAt?: Date;
  attributedTo?: string;
};

export const NEWS_FRESHNESS_MS = 48 * 60 * 60 * 1000;

function compact(value: string) { return value.replace(/\s+/g, " ").trim(); }

function stageFor(text: string, official: boolean): ActionStage {
  const value = normalizeArabic(text);
  if (/سيبدا العمل|سيدخل.{0,25}حيز التنفيذ|نافذ اعتبارا.{0,60}(المقبل|القادم)|يبدا العمل.{0,80}(المقبل|القادم|بعد نشر)/.test(value)) return "effective_scheduled";
  if (/دخل.{0,25}حيز التنفيذ|بدء العمل ب|يبدا العمل ب|نافذ اعتبارا/.test(value)) return "effective";
  if (/نشر.{0,40}الجريده الرسميه|صدر.{0,40}الجريده الرسميه/.test(value)) return "gazette_published";
  if (/(اقر|اعتمد).{0,100}والموافقه علي الاسباب الموجبه/.test(value)) return "unclear";
  if (/الموافقه علي الاسباب الموجبه|وافق.{0,40}الاسباب الموجبه/.test(value)) return "cabinet_approved_reasons";
  if (/مجلس النواب.{0,45}(اقر|وافق)|مجلس الاعيان.{0,45}(اقر|وافق)|اقر.{0,40}مجلس الامه/.test(value)) return "parliament_approved";
  if (/احال.{0,45}مجلس النواب|احيل.{0,45}مجلس النواب|ارسال.{0,45}مجلس النواب/.test(value)) return "referred_to_parliament";
  if (/(وافق|اقر|اعتمد|الموافقه).{0,70}مشروع (قانون|نظام)/.test(value)) return "cabinet_approved_draft";
  if (official && /^الموافقه علي/.test(value)) return "decision_adopted";
  if (/مشروع (قانون|نظام)|مقترح|قيد الدراسه|مسوده/.test(value) && !/(اقر|وافق|اعتمد)/.test(value)) return "proposal";
  if (/تعليمات.{0,35}(جديده|معدله)|اصدر.{0,30}تعليمات|تعميم/.test(value)) return "instruction_issued";
  if (/ضبطت?.{0,100}(عامل|عمال)|فرق التفتيش.{0,120}ضبط|نفذت.{0,60}حمله تفتيشيه/.test(value)) return "enforcement_action";
  if (official && /^حل مجلس اداره غرف التجاره/.test(value)) return "decision_adopted";
  if (/وجه|توجيه|دعا الي/.test(value) && !/(قرر|اقر|اعتمد)/.test(value)) return "directive";
  if (/(قرر|يقرر|اقر|اعتمد|وافق|عدل|تعديل|اطلق|بدء تطبيق|فتح باب|اغلق باب|الغاء)/.test(value)) return official ? "decision_adopted" : "media_reported";
  return "unclear";
}

function authorityFor(material: SourceMaterial, passage: string) {
  if (material.sourceClass === "official") return material.publisher;
  const normalized = normalizeArabic(`${material.title} ${passage}`);
  if (normalized.includes("مجلس الوزراء")) return "رئاسة الوزراء";
  if (normalized.includes(normalizeArabic("الهيئة المستقلة للانتخاب"))) return "الهيئة المستقلة للانتخاب";
  if (normalized.includes("مجلس النواب")) return "مجلس النواب";
  if (normalized.includes("مجلس الاعيان")) return "مجلس الأعيان";
  const ministry = /وزاره\s+[\p{L}]+(?:\s+[\p{L}]+)?/u.exec(material.title);
  return ministry?.[0] || material.publisher;
}

function categoryFor(topics: ReturnType<typeof scoreNewsTopic>["matchedTopics"]): NewsCategory {
  if (topics.includes("legislation")) return "legislation";
  if (topics.includes("elections")) return "elections";
  if (topics.includes("parliament")) return "parliament";
  if (topics.includes("parties")) return "parties";
  if (topics.includes("local_government")) return "municipal";
  if (topics.includes("public_policy")) return "public_services";
  return "government";
}

function exactHeadline(value: string) {
  const text = compact(value).replace(/^على صعيد آخر[،,]\s*/, "");
  if (text.length >= 12 && text.length <= 180) return text;
  const sentence = text.split(/[؛.!؟]/)[0]?.trim();
  if (sentence && sentence.length >= 12 && sentence.length <= 180) return sentence;
  // Government bullet headings often continue with background after the
  // operative clause. Use a verbatim clause only when it names the action.
  const clause = text.split(/[،,:]|\s+بهدف\s+|\s+في إطار\s+|\s+وزيادة\s+|\s+تمهيد[اأً]*\s+|\s+وتكليف\s+/)[0]?.trim().replace(/\s+وهم$/, "");
  return clause && clause.length >= 30 && clause.length <= 180 && stageFor(clause, true) !== "unclear" ? clause : null;
}

function splitMixedDecisions(paragraph: string) {
  const marker = /والموافقة على الأسباب الموجبة/.exec(paragraph);
  if (!marker || !/إقرار|أقر/.test(paragraph.slice(0, marker.index))) return [paragraph];
  const first = paragraph.slice(0, marker.index).trim().replace(/[،؛]$/, "");
  const second = paragraph.slice(marker.index + 1).trim();
  return first.length >= 30 && second.length >= 30 ? [first, second] : [paragraph];
}

function isRoutineTitle(value: string) {
  return /يستقبل|يلتقي|يبحثان|تطلع وفدا|تعقد الورشه|يهنئ|يعزي|يزور|مؤتمر صحفي/.test(normalizeArabic(value));
}

function samePassageDecision(left: string, right: string) {
  const a = significantTokens(left);
  const b = significantTokens(right);
  if (a.size < 3 || b.size < 3) return false;
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.min(a.size, b.size) >= 0.75 && shared >= 4;
}

export function eventDraftsFromMaterial(material: SourceMaterial, now: Date): EventDraft[] {
  const official = material.sourceClass === "official";
  const sourceHeadline = material.detailHeadline || material.title;
  const paragraphs = official && material.paragraphs.length ? material.paragraphs : [material.summary];
  const actionParagraphs = paragraphs.filter((paragraph) => stageFor(paragraph, official) !== "unclear");
  const multipleDecisions = material.sourceId === "prime_ministry" && /مجلس الوزراء/.test(sourceHeadline) && /قرارات|مشروعات|يتخذ|يُقر|يقر/.test(sourceHeadline) && actionParagraphs.length > 1;
  const datelineIndex = paragraphs.findIndex((paragraph) => /^(عمان|معان|اربد|الزرقاء)\s+\d{1,2}\s/.test(normalizeArabic(paragraph)));
  const bulletinHeadings = datelineIndex >= 2 ? paragraphs.slice(0, datelineIndex) : actionParagraphs;
  const splitHeadings = bulletinHeadings.flatMap(splitMixedDecisions).filter((paragraph) => stageFor(paragraph, official) !== "unclear");
  const additionalBodyDecisions = datelineIndex >= 2 ? paragraphs.slice(datelineIndex + 1).filter((paragraph) =>
    /^علي صعيد اخر\s+قرر مجلس الوزراء/.test(normalizeArabic(paragraph)) && stageFor(paragraph, official) !== "unclear" && !splitHeadings.some((heading) => samePassageDecision(heading, paragraph))
  ) : [];
  const allPassages = [...splitHeadings, ...additionalBodyDecisions];
  const governmentPublisher = official && /وزار/.test(material.publisher);
  const publicActivity = governmentPublisher ? null : classifyPublicActivity(sourceHeadline, paragraphs.join(" "), official ? material.publisher : "", material.publishedAt);
  const passages = multipleDecisions ? allPassages.filter((paragraph, index) => !allPassages.slice(0, index).some((earlier) => samePassageDecision(earlier, paragraph))) : [publicActivity ? paragraphs[0] || material.summary : material.paragraphs.find((paragraph) => stageFor(paragraph, official) !== "unclear") || material.summary];
  const drafts: EventDraft[] = [];
  for (const passage of passages.slice(0, 20)) {
    let stage = stageFor(passage, official);
    const headline = multipleDecisions ? exactHeadline(passage) : exactHeadline(sourceHeadline) || exactHeadline(passage);
    if (!headline) continue; // A long bulletin needs review, not a fabricated title.
    const topic = scoreNewsTopic(headline, `${passage} ${official ? `الأردن ${material.publisher}` : ""}`);
    const activity = !multipleDecisions && !governmentPublisher ? classifyPublicActivity(headline, passage, official ? material.publisher : "", material.publishedAt) : null;
    const activityAllowed = Boolean(activity && topic.score >= 6);
    if (activityAllowed && activity?.kind === "legislation") {
      const legalEvidence = normalizeArabic(`${headline} ${passage}`);
      if (activity.status === "recommended" || /توصي|اوصت|اوصي|توصيه/.test(normalizeArabic(headline))) stage = "recommendation";
      else if (stage === "cabinet_approved_draft" || stage === "parliament_approved") {
        stage = /لجنه|اللجنه|اللجان/.test(normalizeArabic(headline)) ? "committee_adopted" : /مجلس النواب|مجلس الاعيان|مجلس الامه/.test(legalEvidence) ? "parliament_approved" : "unclear";
      }
    }
    if (activityAllowed && activity?.kind === "legislation" && /احال.{0,80}(لجنه|اللجنه|اللجان)|احاله.{0,80}(لجنه|اللجنه|اللجان)/.test(normalizeArabic(`${headline} ${passage}`))) stage = "referred_to_committee";
    if (activityAllowed && activity?.kind === "legislation" && /نتيجه التصويت|نتائج التصويت|صوت.{0,60}(اغلبيه|رفض|مع|ضد)/.test(normalizeArabic(`${headline} ${passage}`)) && stage !== "parliament_approved") stage = "vote_result";
    if (activityAllowed && activity && (activity.kind !== "legislation" || ["unclear", "directive", "media_reported"].includes(stage))) {
      stage = activity.status === "announced" ? "activity_announced" : activity.status === "held" ? "activity_held" : activity.status === "postponed" ? "activity_postponed" : activity.status === "cancelled" ? "activity_cancelled" : activity.status === "discussed" ? "discussion" : activity.status === "recommended" ? "recommendation" : activity.kind.endsWith("update") || activity.kind.endsWith("election") ? "institutional_update" : "statement";
    }
    const stale = now.getTime() - material.publishedAt.getTime() > NEWS_FRESHNESS_MS;
    const future = material.publishedAt.getTime() > now.getTime() + 10 * 60_000;
    const hardExcluded = !official && isObviousNonNashmiNews(sourceHeadline);
    const normalizedEvidence = normalizeArabic(`${sourceHeadline} ${passage}`);
    const officialDecision = official && !isRoutineTitle(sourceHeadline) && ["cabinet_approved_reasons", "cabinet_approved_draft", "decision_adopted", "instruction_issued", "directive", "enforcement_action"].includes(stage) && (/مجلس الوزراء|الوزاره|وزاره|العمل/.test(normalizedEvidence) || normalizedEvidence.includes(normalizeArabic("رئيس الوزراء")));
    const relevant = topic.score >= 6 || (officialDecision && (multipleDecisions || /يوجه|توضح اليه|تضبط|قرار|قرارات|اصدر|اعلن/.test(normalizeArabic(sourceHeadline))));
    const documentedGovernmentProposal = official && stage === "proposal" && /مشروع قانون|مشروع نظام/.test(normalizedEvidence) && /الوزاره|وزاره|الوزراء/.test(normalizeArabic(material.publisher));
    const supported = activityAllowed || (documentedGovernmentProposal && relevant) || (stage !== "unclear" && stage !== "proposal" && relevant);
    const verifiedPublication = material.publicationVerified !== false;
    const permittedAiInput = material.aiInputAllowed !== false && sourceById(material.sourceId).aiInputAllowed !== false;
    const eligible = verifiedPublication && permittedAiInput && !stale && !future && !hardExcluded && supported;
    const reason = !verifiedPublication ? "original_publication_unverified" : !permittedAiInput ? "source_ai_input_prohibited" : stale ? "older_than_48_hours" : future ? "future_publication_date" : hardExcluded ? "unrelated_topic" : supported ? null : stage === "proposal" ? "proposal_without_decision" : stage === "unclear" ? "no_verified_action" : "outside_civic_scope";
    const summaryAr = compact(passage).slice(0, 900);
    if (summaryAr.length < 30) continue;
    const authority = activity?.category === "parties" ? activity.actor || activity.attributedTo : authorityFor(material, passage);
    const eventKey = sha256(`${material.sourceId}|${material.publishedAt.toISOString().slice(0, 10)}|${normalizeArabic(headline)}|${stage}`);
    drafts.push({ eventKey, titleAr: headline, summaryAr, passage: summaryAr, category: activityAllowed && activity ? activity.category : categoryFor(topic.matchedTopics), authority, actionStage: stage, verification: official ? "official" : "reported", publishedAt: material.publishedAt, eligible, reason, scopeSupported: supported && !hardExcluded, eventKind: activity?.kind || (topic.matchedTopics.includes("legislation") ? "legislation" : stage === "instruction_issued" ? "government_regulation" : "government_decision"), eventStatus: activity?.status || (stage === "proposal" ? "announced" : stage === "unclear" || stage === "media_reported" ? "reported" : "adopted"), scheduledAt: activity?.scheduledAt, attributedTo: activity?.attributedTo });
  }
  return drafts;
}

function significantTokens(value: string) {
  return new Set(normalizeArabic(value).split(/\s+/).filter((token) => token.length >= 4 && !["مجلس", "الوزراء", "وزاره", "الجديده", "الاردنيه", "الاردن"].includes(token)));
}

export function sameNewsEvent(a: Pick<EventDraft, "titleAr" | "authority" | "actionStage" | "publishedAt"> & Partial<Pick<EventDraft, "attributedTo" | "scheduledAt" | "eventStatus">>, b: Pick<EventDraft, "titleAr" | "authority" | "actionStage" | "publishedAt"> & Partial<Pick<EventDraft, "attributedTo" | "scheduledAt" | "eventStatus">>) {
  if (a.attributedTo && b.attributedTo && normalizeArabic(a.attributedTo) !== normalizeArabic(b.attributedTo)) return false;
  if (a.eventStatus && b.eventStatus && a.eventStatus !== b.eventStatus) return false;
  if (a.scheduledAt && b.scheduledAt && a.scheduledAt.getTime() !== b.scheduledAt.getTime()) return false;
  const sameAppointment = a.scheduledAt && b.scheduledAt && a.scheduledAt.getTime() === b.scheduledAt.getTime();
  if (a.authority !== b.authority || a.actionStage !== b.actionStage || (!sameAppointment && Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime()) > 2 * 24 * 60 * 60_000)) return false;
  const left = significantTokens(a.titleAr);
  const right = significantTokens(b.titleAr);
  if (left.size < 3 || right.size < 3) return normalizeArabic(a.titleAr) === normalizeArabic(b.titleAr);
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / Math.max(left.size, right.size) >= 0.75;
}
