import { normalizeArabic } from "@/lib/arabicSearch";
import type { NewsCategory } from "@/lib/news/types";

type RelevanceInput = {
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  nashmiRelevant: boolean;
  relevanceReason: string;
  civicImpact: "low" | "medium" | "high";
};

const PROCESS_CATEGORIES = new Set<NewsCategory>(["legislation", "parliament", "parties", "elections"]);
const PROCESS_TERMS = ["قانون", "تشريع", "نظام", "تعديل", "مجلس النواب", "مجلس الاعيان", "لجنه نيابيه", "لجنه برلمانيه", "حزب", "احزاب", "انتخاب", "هييه مستقله للانتخاب", "اصلاح سياسي"];
const PROCESS_ACTIONS = ["يناقش", "بحث مشروع", "يبدا مناقشه", "يقر", "اقر", "وافق", "يوافق", "يصوت", "تصويت", "احال", "يحيل", "اعلن", "تعلن", "تسجيل", "ترخيص", "حل حزب", "نشر في الجريده", "دخل حيز التنفيذ", "صادق", "تعديل", "تقدم بمشروع", "مشروع قانون"];
const POLICY_TERMS = ["سياسه", "قرار حكومي", "قرار مجلس الوزراء", "مجلس الوزراء", "نظام", "قانون", "تعليمات", "رسوم", "ضريبه", "تعرفه", "خدمه حكوميه", "خدمات حكوميه", "قواعد خدمه", "خدمه المياه", "نقل عام", "تعليم", "بلديات", "مشاركه مدنيه", "اصلاح", "موازنه", "استراتيجيه وطنيه"];
const POLICY_ACTIONS = ["يقر", "تقر", "اقر", "وافق", "تعتمد", "اعتمد", "اطلق", "قرر", "يقرر", "يعدل", "تعدل", "تعديل", "رفع", "خفض", "الغاء", "تغيير", "تغير", "بدء تطبيق", "تطبيق نظام", "دخل حيز التنفيذ", "صدر", "اصدر", "تعليمات جديده", "قواعد جديده", "تنظيم"];
const ROUTINE_TERMS = ["ضبط", "مخالفه", "مخالفات", "مصادره", "منتهي الصلاحيه", "مقلد", "اعتداء على شبكه", "اعتداءات على شبكه", "حادث سير", "حريق", "جريمه", "توقيف", "مداهمه", "جوله تفتيشيه", "دوره تدريبيه", "ورشه تدريبيه", "سعر الذهب", "اسعار الذهب", "سعر صرف", "حاله الطقس", "درجات الحراره", "مباراه", "فوز المنتخب", "مهرجان فني", "زياره بروتوكوليه", "مذكره تفاهم"];
const CEREMONIAL_TERMS = ["يشارك في اجتماع", "يحضر اجتماع", "يلتقي", "استقبل", "يزور", "هنأ", "هناء", "يعزي", "ودع"];
const ROYAL_TERMS = ["الملك", "جلاله الملك", "ولي العهد", "الديوان الملكي"];
const MAJOR_AFFAIRS = ["السياسه الحكوميه", "السياسات الحكوميه", "اصلاح", "تشريع", "قانون", "الامن الوطني", "الاستقرار الاقليمي", "القضيه الفلسطينيه", "سياده الاردن", "ازمه وطنيه", "قرار حكومي"];

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeArabic(term)));
}

export function isNashmiRelevant(input: RelevanceInput) {
  if (!input.nashmiRelevant || input.relevanceReason.trim().length < 12) return false;

  const title = normalizeArabic(input.titleAr);
  const text = normalizeArabic(`${input.titleAr} ${input.summaryAr}`);
  const substantiveProcess = hasAny(text, PROCESS_TERMS) && hasAny(text, PROCESS_ACTIONS);
  const policyChange = hasAny(text, POLICY_TERMS) && hasAny(text, POLICY_ACTIONS);
  const routineStory = hasAny(title, ROUTINE_TERMS);
  const royalStory = hasAny(title, ROYAL_TERMS);

  // An incident or inspection is not a civic policy change merely because a
  // ministry, municipality or public utility was involved.
  if (routineStory && !policyChange && !substantiveProcess) return false;
  if (royalStory && hasAny(title, CEREMONIAL_TERMS) && !hasAny(text, MAJOR_AFFAIRS)) return false;

  if (PROCESS_CATEGORIES.has(input.category) && substantiveProcess) return true;
  if (input.civicImpact === "low") return false;
  if (royalStory) return hasAny(text, MAJOR_AFFAIRS) && (policyChange || hasAny(text, ["دعا", "اكد", "يؤكد", "حذر", "اعلن", "قرر"]));
  return policyChange;
}
