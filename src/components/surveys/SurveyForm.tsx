"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import SurveyQuestionCard from "@/components/surveys/SurveyQuestionCard";
import SurveyResultsSummary from "@/components/surveys/SurveyResultsSummary";
import { useToast } from "@/components/ui/ToastProvider";

type Survey = {
  _id: string;
  slug?: string;
  questions: Array<{ _id: string; title: string; description?: string | null; type: string; required?: boolean; order?: number; options?: Array<{ _id: string; label: string; order?: number }> }>;
  hasResponded?: boolean;
  canRespond?: boolean;
  canViewResults?: boolean;
  resultSummary?: any;
};

function answered(question: Survey["questions"][number], answer: any) {
  if (!answer) return false;
  if (question.type === "SINGLE_CHOICE" || question.type === "YES_NO") return Boolean(answer.optionId);
  if (question.type === "MULTIPLE_CHOICE") return Array.isArray(answer.optionIds) && answer.optionIds.length > 0;
  if (question.type === "RATING") return Number(answer.valueNumber) >= 1 && Number(answer.valueNumber) <= 5;
  if (question.type === "TEXT") return Boolean(String(answer.valueText || "").trim());
  return false;
}

export default function SurveyForm({ survey, isLoggedIn }: { survey: Survey; isLoggedIn: boolean }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [hasResponded, setHasResponded] = useState(Boolean(survey.hasResponded));
  const [canViewResults, setCanViewResults] = useState(Boolean(survey.canViewResults));
  const [resultSummary, setResultSummary] = useState(survey.resultSummary);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const questions = useMemo(() => [...(survey.questions || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)), [survey.questions]);

  async function submit() {
    const missing = questions.find((question) => question.required !== false && !answered(question, answers[question._id]));
    if (missing) {
      showToast("يرجى الإجابة عن جميع الأسئلة المطلوبة.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/surveys/${survey._id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: Object.values(answers).filter(Boolean) })
      });
      const json = await response.json().catch(() => ({}));
      setLoading(false);
      if (!json.ok) {
        showToast(json.error?.message || "تعذر حفظ المشاركة.", "error");
        return;
      }
      setHasResponded(true);
      setCanViewResults(true);
      setResultSummary(json.data.resultSummary);
      showToast("تم حفظ مشاركتك في الاستبيان.", "success");
    } catch {
      setLoading(false);
      showToast("تعذر الاتصال بالخادم.", "error");
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="card p-5">
        <h2 className="text-xl font-black">المشاركة تتطلب تسجيل الدخول</h2>
        <p className="mt-2 text-ink/65 dark:text-slate-300">يمكنك الاطلاع على الاستبيان، وللمشاركة يرجى تسجيل الدخول إلى حسابك.</p>
        <Link href="/login" className="mt-4 inline-flex rounded bg-civic px-4 py-2 font-bold text-white hover:bg-civic/90">تسجيل الدخول</Link>
      </div>
    );
  }

  if (hasResponded) {
    return (
      <div className="space-y-5">
        <div className="card border-civic/30 bg-civic/5 p-5 dark:bg-emerald-200/8">
          <h2 className="text-xl font-black">لقد شاركت سابقًا في هذا الاستبيان.</h2>
          <p className="mt-2 text-ink/65 dark:text-slate-300">لا يمكن إرسال مشاركة ثانية، ويمكنك الاطلاع على النتائج حسب إعدادات الناشر.</p>
        </div>
        <SurveyResultsSummary summary={resultSummary} blocked={!canViewResults} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurveyResultsSummary summary={resultSummary} blocked={!canViewResults} />
      <section className="space-y-4 rounded-lg border border-line bg-zinc-50 p-4 dark:bg-slate-900/40">
        <div className="border-b border-line pb-3">
          <h2 className="text-2xl font-black">أسئلة الاستبيان</h2>
          <p className="mt-1 text-sm text-ink/65 dark:text-slate-300">تستخدم إجابتك لأغراض إحصائية داخل المنصة.</p>
        </div>
        {questions.map((question, index) => (
          <SurveyQuestionCard key={question._id} question={question} index={index} value={answers[question._id]} onChange={(value) => setAnswers((current) => ({ ...current, [question._id]: value }))} disabled={!survey.canRespond || loading} />
        ))}
        <button type="button" onClick={submit} disabled={!survey.canRespond || loading} className="inline-flex items-center gap-2 rounded bg-civic px-5 py-3 font-black text-white hover:bg-civic/90 disabled:opacity-60">
          <Send className="h-4 w-4" />
          {loading ? "جار الحفظ..." : survey.canRespond ? "إرسال المشاركة" : "الاستبيان غير متاح للمشاركة"}
        </button>
      </section>
    </div>
  );
}
