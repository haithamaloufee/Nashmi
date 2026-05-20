import { BarChart3, Clock3, Star } from "lucide-react";
import SurveyEmptyState from "@/components/surveys/SurveyEmptyState";
import SurveyResultsChart from "@/components/surveys/SurveyResultsChart";

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

function formatUpdated(value?: string | null) {
  if (!value) return "لم يتم التحديث بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "لم يتم التحديث بعد";
  return date.toLocaleString("ar-JO", { dateStyle: "medium", timeStyle: "short" });
}

export default function SurveyResultsSummary({ summary, blocked = false }: { summary?: ResultSummary | null; blocked?: boolean }) {
  if (blocked) {
    return (
      <section className="card p-5">
        <h2 className="text-xl font-black">نتائج الاستبيان</h2>
        <p className="mt-2 text-ink/65 dark:text-slate-300">ستظهر النتائج حسب إعدادات الناشر بعد المشاركة أو للناشر فقط.</p>
      </section>
    );
  }
  if (!summary || summary.totalResponses === 0) {
    return (
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-civic">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-xl font-black text-ink dark:text-white">نتائج الاستبيان</h2>
        </div>
        <SurveyEmptyState />
      </section>
    );
  }

  return (
    <section className="card space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-civic">
            <BarChart3 className="h-5 w-5" />
            <h2 className="text-xl font-black text-ink dark:text-white">نتائج الاستبيان</h2>
          </div>
          <p className="mt-1 text-sm text-ink/65 dark:text-slate-300">
            {summary.totalResponses.toLocaleString("ar-JO")} مشاركة محفوظة
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink/65 dark:bg-slate-900 dark:text-slate-300">
          <Clock3 className="h-3.5 w-3.5" />
          آخر تحديث: {formatUpdated(summary.lastUpdatedAt)}
        </span>
      </div>

      <div className="grid gap-4">
        {summary.questions.map((question) => (
          <div key={question.id} className="rounded border border-line bg-paper/70 p-4 dark:bg-slate-950/60">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black">{question.title}</h3>
              <span className="text-xs font-bold text-ink/55 dark:text-slate-400">{question.totalAnswers.toLocaleString("ar-JO")} إجابة</span>
            </div>
            {question.type === "RATING" ? (
              <>
                <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800 dark:bg-amber-300/15 dark:text-amber-100">
                  <Star className="h-4 w-4" />
                  المتوسط: {question.averageRating ?? 0} / 5
                </div>
                <SurveyResultsChart items={question.ratingDistribution.map((item) => ({ id: String(item.value), label: `${item.value} نجوم`, count: item.count, percentage: item.percentage }))} />
              </>
            ) : question.type === "TEXT" ? (
              <p className="rounded border border-line bg-white p-3 text-sm text-ink/70 dark:bg-slate-900 dark:text-slate-300">
                عدد الإجابات النصية: {Number(question.textAnswerCount || 0).toLocaleString("ar-JO")}
              </p>
            ) : (
              <SurveyResultsChart items={question.options} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
