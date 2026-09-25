import { normalizeArabic } from "@/lib/arabicSearch";
import { NEWS_CATEGORIES, type NewsCategory } from "@/lib/news/types";

export const NEWS_REASON_CODES = [
  "NEW_LEGISLATION", "LEGISLATIVE_STAGE_CHANGE", "GOVERNMENT_POLICY",
  "PARLIAMENTARY_ACTION", "PARTY_POLITICS", "ELECTION_UPDATE",
  "POLITICAL_REFORM", "MAJOR_LOCAL_POLICY", "MAJOR_PUBLIC_POLICY", "NOT_RELEVANT"
] as const;

export type NewsDecision = {
  index: number;
  relevant: boolean;
  category: NewsCategory;
  civicImpact: "low" | "medium" | "high";
  reasonCode: (typeof NEWS_REASON_CODES)[number];
};

const EXCLUDED = /(اطارات منتهيه|لحوم منتهيه|مواد غذائيه منتهيه|ضبط.{0,25}(لحوم|اطارات|مواد)|مصادره|مخالفه مائيه|اعتداء علي شبكه مياه|تفتيش روتيني|حمله تفتيشيه|جريمه قتل|حادث سير|حوادث سير|حريق|طقس|حاله جويه|درجات الحراره|كره القدم|مباراه|دوري المحترفين|فنان|مهرجان|مشاهير|ابراج|اعلان تجاري|عروض تجاريه|استطلاع راي|شارك برايك|ما رايك|رايكم|ورشه تدريبيه|دوره تدريبيه)/;
const CIVIC = /(قانون|قوانين|تشريع|تشريعات|نظام انتخابي|نظام جديد|نظام معدل|مشروع نظام|مشروع قانون|مجلس الوزراء|مجلس النواب|مجلس الاعيان|لجنه نيابيه|لجان نيابيه|الهييه المستقله للانتخاب|انتخابات|انتخابيه|الاحزاب|حزب سياسي|قانون الاحزاب|الاداره المحليه|قرار حكومي|سياسه|اصلاح سياسي|البلديات|المجالس المحليه|امانه عمان|الجريده الرسميه|الناقل الوطني|الموازنه العامه|حقوق الانسان|الخدمه المدنيه)/;
const ACTION = /(يقر|اقر|تقر|اقرت|يوافق|وافق|يعدل|عدل|تعديل|يناقش|ناقش|يصوت|تصويت|يحيل|احاله|اصدر|يصدر|تعلن|اعلنت|اعتماد|يعتمد|قرار|قرارات|تعليمات|تغيير|تغييرات|يلغي|الغاء|اطلاق|اطلقت|بدء تطبيق|نفاذ|نشر)/;
const OBVIOUS = [
  { pattern: /مجلس النواب.{0,35}(يقر|اقر|يعدل|عدل|يحيل|احاله).{0,45}(قانون|تشريع)|(?:يقر|اقر|يعدل|عدل).{0,35}(قانون|تشريع).{0,35}مجلس النواب/, category: "legislation", reasonCode: "LEGISLATIVE_STAGE_CHANGE" },
  { pattern: /مجلس الوزراء.{0,35}(يقر|اقر|وافق|يوافق).{0,45}(مشروع قانون|مشروع نظام|نظام جديد|نظام معدل)/, category: "legislation", reasonCode: "NEW_LEGISLATION" },
  { pattern: /الهييه المستقله للانتخاب.{0,45}(تعليمات انتخابيه|قواعد الانتخاب|موعد الانتخابات|الاقتراع|الترشح)/, category: "elections", reasonCode: "ELECTION_UPDATE" }
] as const;

export function prefilterCivicNews(title: string, summary: string) {
  const headline = normalizeArabic(title);
  const content = normalizeArabic(`${title} ${summary}`);
  if (EXCLUDED.test(headline)) return false;
  return CIVIC.test(content) && ACTION.test(content);
}

export function obviousCivicDecision(title: string, summary: string, index: number): NewsDecision | null {
  if (!prefilterCivicNews(title, summary)) return null;
  const headline = normalizeArabic(title);
  const match = OBVIOUS.find((rule) => rule.pattern.test(headline));
  return match ? { index, relevant: true, category: match.category, civicImpact: "high", reasonCode: match.reasonCode } : null;
}

export function isPublishableDecision(decision: NewsDecision | undefined | null) {
  return Boolean(decision?.relevant && decision.reasonCode !== "NOT_RELEVANT" && decision.civicImpact !== "low" && NEWS_CATEGORIES.includes(decision.category));
}
