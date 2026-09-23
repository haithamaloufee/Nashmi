import { normalizeArabic } from "@/lib/arabicSearch";

export function isExplicitCurrentNewsQuestion(message: string) {
  const normalized = normalizeArabic(message);
  const english = message.toLowerCase();
  return ["اخر تحديث", "آخر تحديث", "اخر الاخبار", "آخر الأخبار", "شو الاخبار", "شو الأخبار", "شو صار", "ماذا حدث", "حاليا", "حاليًا", "اليوم", "هل تغير", "هل تغيّر", "latest update", "latest news", "what happened", "current status", "today", "has changed"]
    .some((pattern) => normalized.includes(normalizeArabic(pattern)) || english.includes(pattern));
}
