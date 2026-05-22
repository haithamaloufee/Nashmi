"use client";

import { BarChart3, Clock3, Star } from "lucide-react";
import SurveyEmptyState from "@/components/surveys/SurveyEmptyState";
import SurveyResultsChart from "@/components/surveys/SurveyResultsChart";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";

type ResultSummary = {
  totalResponses: number;
  lastUpdatedAt?: string | null;
  questions: Array<{
    id: string;
    title: string;
    type: string;
    totalAnswers: number;
    options: Array<{ id: string; label: string; count: number; percentage: number }>;
    ratingDistribution: Array<{ value: number; count: number; percentage: number }>;
    averageRating?: number | null;
    textAnswerCount?: number;
  }>;
};

function formatUpdated(value: string | null | undefined, language: "ar" | "en") {
  const fallback = language === "ar" ? "لم يتم التحديث بعد" : "Not updated yet";
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(language === "ar" ? "ar-JO" : "en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function SurveyResultsSummary({ summary, blocked = false }: { summary?: ResultSummary | null; blocked?: boolean }) {
  const { language, t } = useTranslation();

  if (blocked) {
    return (
      <section className="card p-5">
        <h2 className="text-xl font-black">{t("survey.results")}</h2>
        <p className="mt-2 text-ink/65 dark:text-slate-300">ستظهر النتائج حسب إعدادات الناشر بعد المشاركة أو للناشر فقط.</p>
      </section>
    );
  }

  if (!summary || summary.totalResponses === 0) {
    return (
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-civic">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-xl font-black text-ink dark:text-white">{t("survey.results")}</h2>
        </div>
        <SurveyEmptyState />
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 text-civic">
            <BarChart3 className="h-5 w-5" />
            <h2 className="text-xl font-black text-ink dark:text-white">{t("survey.results")}</h2>
          </div>
          <p className="mt-2 text-sm font-bold text-ink/65 dark:text-slate-300">
            {t("survey.totalParticipation")}: <span className="text-civic dark:text-emerald-200">{formatNumber(summary.totalResponses, language)}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink/65 dark:bg-slate-900 dark:text-slate-300">
          <Clock3 className="h-3.5 w-3.5" />
          {t("survey.latestUpdate")}: {formatUpdated(summary.lastUpdatedAt, language)}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {summary.questions.map((question) => (
          <article key={question.id} className="rounded-lg bg-paper/55 p-4 dark:bg-slate-900/55">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 text-base font-black leading-7">{question.title}</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink/55 ring-1 ring-line dark:bg-slate-950 dark:text-slate-400">
                {formatNumber(question.totalAnswers, language)} {t("survey.responses")}
              </span>
            </div>
            {question.type === "RATING" ? (
              <>
                <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 dark:bg-amber-300/15 dark:text-amber-100">
                  <Star className="h-3.5 w-3.5" />
                  {language === "ar" ? "المتوسط" : "Average"}: <span dir="ltr">{question.averageRating ?? 0} / 5</span>
                </div>
                <SurveyResultsChart items={question.ratingDistribution.map((item) => ({ id: String(item.value), label: language === "ar" ? `${item.value} نجوم` : `${item.value} stars`, count: item.count, percentage: item.percentage }))} />
              </>
            ) : question.type === "TEXT" ? (
              <p className="rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-ink/70 dark:bg-slate-950 dark:text-slate-300">
                {language === "ar" ? "عدد الإجابات النصية" : "Text answers"}: {formatNumber(question.textAnswerCount || 0, language)}
              </p>
            ) : (
              <SurveyResultsChart items={question.options} />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
