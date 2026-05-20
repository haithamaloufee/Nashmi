"use client";

import { useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import SurveyStatusBadge from "@/components/surveys/SurveyStatusBadge";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "YES_NO" | "RATING" | "TEXT";
type BuilderOption = { id?: string; label: string; value?: string | null; order: number };
type BuilderQuestion = { id?: string; title: string; description?: string | null; type: QuestionType; required: boolean; order: number; options: BuilderOption[] };

type Survey = {
  _id: string;
  title: string;
  description?: string | null;
  status?: string;
  resultsVisibility?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  partyId?: any;
  authorType?: string;
  totalResponses?: number;
  createdAt?: string;
  questions?: Array<any>;
};

const emptyQuestion = (): BuilderQuestion => ({
  title: "",
  description: "",
  type: "SINGLE_CHOICE",
  required: true,
  order: 0,
  options: [
    { label: "", order: 0 },
    { label: "", order: 1 }
  ]
});

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromSurvey(survey?: Survey | null): BuilderQuestion[] {
  if (!survey?.questions?.length) return [emptyQuestion()];
  return [...survey.questions]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((question, index) => ({
      id: question._id,
      title: question.title || "",
      description: question.description || "",
      type: question.type || "SINGLE_CHOICE",
      required: question.required !== false,
      order: index,
      options: [...(question.options || [])]
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((option, optionIndex) => ({ id: option._id, label: option.label || "", value: option.value || null, order: optionIndex }))
    }));
}

function cleanQuestions(questions: BuilderQuestion[]) {
  return questions.map((question, index) => ({
    id: question.id,
    title: question.title,
    description: question.description || null,
    type: question.type,
    required: question.required,
    order: index,
    options: question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE"
      ? question.options.map((option, optionIndex) => ({ id: option.id, label: option.label, value: option.value || null, order: optionIndex })).filter((option) => option.label.trim())
      : []
  }));
}

function validateBuilder(input: { title: string; mode: "party" | "iec" | "admin"; publisherType: string; partyId: string; questions: BuilderQuestion[] }) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("عنوان الاستبيان مطلوب.");
  if (input.mode === "admin" && input.publisherType === "party" && !input.partyId) errors.push("اختيار الحزب مطلوب عند النشر باسم حزب.");
  if (!input.questions.length) errors.push("أضف سؤالًا واحدًا على الأقل.");

  input.questions.forEach((question, questionIndex) => {
    const prefix = `السؤال ${questionIndex + 1}`;
    if (!question.title.trim()) errors.push(`${prefix}: نص السؤال مطلوب.`);
    if (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE") {
      const labels = question.options.map((option) => option.label.trim()).filter(Boolean);
      if (labels.length < 2) errors.push(`${prefix}: أضف خيارين على الأقل.`);
      if (labels.length !== question.options.length) errors.push(`${prefix}: لا تترك خيارات فارغة.`);
      if (new Set(labels).size !== labels.length) errors.push(`${prefix}: لا يمكن تكرار الخيارات.`);
    }
  });

  return errors;
}

export default function SurveyBuilderForm({ surveys, mode, parties = [] }: { surveys: Survey[]; mode: "party" | "iec" | "admin"; parties?: Array<{ _id: string; name: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Survey | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [resultsVisibility, setResultsVisibility] = useState("BEFORE_SUBMIT");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [publisherType, setPublisherType] = useState(mode === "iec" ? "iec" : mode === "party" ? "party" : "admin");
  const [partyId, setPartyId] = useState("");
  const [questions, setQuestions] = useState<BuilderQuestion[]>([emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const sortedSurveys = useMemo(() => [...surveys].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()), [surveys]);
  const structureLocked = Boolean(editing && Number(editing.totalResponses || 0) > 0);

  function reset() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStatus("draft");
    setResultsVisibility("BEFORE_SUBMIT");
    setStartsAt("");
    setEndsAt("");
    setPublisherType(mode === "iec" ? "iec" : mode === "party" ? "party" : "admin");
    setPartyId("");
    setQuestions([emptyQuestion()]);
    setErrors([]);
  }

  function edit(survey: Survey) {
    setEditing(survey);
    setTitle(survey.title || "");
    setDescription(survey.description || "");
    setStatus(survey.status || "draft");
    setResultsVisibility(survey.resultsVisibility || "BEFORE_SUBMIT");
    setStartsAt(toLocalInput(survey.startsAt));
    setEndsAt(toLocalInput(survey.endsAt));
    setPublisherType(survey.authorType || (mode === "admin" ? "admin" : mode));
    setPartyId(typeof survey.partyId === "object" ? survey.partyId?._id || "" : survey.partyId || "");
    setQuestions(fromSurvey(survey));
    setErrors([]);
  }

  function updateQuestion(index: number, patch: Partial<BuilderQuestion>) {
    if (structureLocked) return;
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    if (structureLocked) return;
    setQuestions((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((question, order) => ({ ...question, order }));
    });
  }

  function updateOption(questionIndex: number, optionIndex: number, label: string) {
    if (structureLocked) return;
    setQuestions((current) => current.map((question, itemIndex) => {
      if (itemIndex !== questionIndex) return question;
      return { ...question, options: question.options.map((option, index) => index === optionIndex ? { ...option, label } : option) };
    }));
  }

  async function submit() {
    const validationErrors = validateBuilder({ title, mode, publisherType, partyId, questions });
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    const payload = {
      title,
      description: description || null,
      status,
      publisherType,
      partyId: publisherType === "party" ? partyId || null : null,
      resultsVisibility,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      ...(structureLocked ? {} : { questions: cleanQuestions(questions) })
    };
    setLoading(true);
    try {
      const response = await fetch(editing ? `/api/surveys/${editing._id}` : "/api/surveys", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      setLoading(false);
      if (!json.ok) {
        showToast(json.error?.message || "تعذر حفظ الاستبيان.", "error");
        return;
      }
      showToast("تم حفظ الاستبيان.", "success");
      reset();
      router.refresh();
    } catch {
      setLoading(false);
      showToast("تعذر الاتصال بالخادم.", "error");
    }
  }

  async function setSurveyStatus(survey: Survey, nextStatus: string) {
    const response = await fetch(`/api/surveys/${survey._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const json = await response.json().catch(() => ({}));
    showToast(json.ok ? "تم تحديث الحالة." : json.error?.message || "تعذر تحديث الحالة.", json.ok ? "success" : "error");
    if (json.ok) router.refresh();
  }

  async function archive(survey: Survey) {
    if (!window.confirm("هل تريد أرشفة هذا الاستبيان؟")) return;
    const response = await fetch(`/api/surveys/${survey._id}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    showToast(json.ok ? "تمت أرشفة الاستبيان." : json.error?.message || "تعذر الأرشفة.", json.ok ? "success" : "error");
    if (json.ok) router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
      <form action={() => { void submit(); }} className="card h-fit space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{editing ? "تعديل Community Pulse" : "Community Pulse جديد"}</h2>
            <p className="mt-1 text-sm text-ink/60 dark:text-slate-300">أنشئ استبيانًا بعدة أسئلة ونتائج قابلة للعرض.</p>
          </div>
          {editing ? <button type="button" onClick={reset} className="rounded border border-line px-3 py-1.5 text-sm font-bold">جديد</button> : null}
        </div>

        {structureLocked ? (
          <div className="rounded border border-civic/25 bg-civic/10 p-3 text-sm font-semibold leading-7 text-civic">
            لا يمكن تعديل بنية الأسئلة أو الخيارات بعد وجود مشاركات، حفاظًا على دقة النتائج.
          </div>
        ) : null}

        {errors.length ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-7 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        ) : null}

        {mode === "admin" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">
              الناشر
              <select value={publisherType} onChange={(event) => setPublisherType(event.target.value)} className="rounded border-line">
                <option value="admin">المنصة</option>
                <option value="iec">الهيئة</option>
                <option value="party">حزب</option>
              </select>
            </label>
            {publisherType === "party" ? (
              <label className="grid gap-1 text-sm font-bold">
                الحزب
                <select value={partyId} onChange={(event) => setPartyId(event.target.value)} className="rounded border-line" required>
                  <option value="">اختر الحزب</option>
                  {parties.map((party) => <option key={party._id} value={party._id}>{party.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded border-line" placeholder="عنوان الاستبيان" required />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded border-line" rows={3} placeholder="وصف قصير" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">الحالة
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border-line">
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="closed">مغلق</option>
              <option value="archived">مؤرشف</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">ظهور النتائج
            <select value={resultsVisibility} onChange={(event) => setResultsVisibility(event.target.value)} className="rounded border-line">
              <option value="BEFORE_SUBMIT">قبل المشاركة</option>
              <option value="AFTER_SUBMIT">بعد المشاركة</option>
              <option value="PUBLISHER_ONLY">للناشر فقط</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">بداية الاستبيان
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="rounded border-line" />
          </label>
          <label className="grid gap-1 text-sm font-bold">نهاية الاستبيان
            <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="rounded border-line" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black">الأسئلة</h3>
            <button type="button" disabled={structureLocked} onClick={() => setQuestions((current) => [...current, { ...emptyQuestion(), order: current.length }])} className="inline-flex items-center gap-1 rounded border border-line px-3 py-1.5 text-sm font-bold hover:border-civic disabled:cursor-not-allowed disabled:opacity-50">
              <Plus className="h-4 w-4" />
              سؤال
            </button>
          </div>
          {questions.map((question, questionIndex) => (
            <div key={question.id || questionIndex} className="rounded border border-line bg-paper/70 p-3 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-black text-civic">سؤال {questionIndex + 1}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveQuestion(questionIndex, -1)} className="rounded p-1 hover:bg-civic/10" aria-label="رفع السؤال"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveQuestion(questionIndex, 1)} className="rounded p-1 hover:bg-civic/10" aria-label="خفض السؤال"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))} className="rounded p-1 text-red-700 hover:bg-red-50" aria-label="حذف السؤال"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <input value={question.title} onChange={(event) => updateQuestion(questionIndex, { title: event.target.value })} className="mb-2 w-full rounded border-line" placeholder="نص السؤال" required />
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={question.type} onChange={(event) => updateQuestion(questionIndex, { type: event.target.value as QuestionType, options: event.target.value === "SINGLE_CHOICE" || event.target.value === "MULTIPLE_CHOICE" ? question.options.length >= 2 ? question.options : emptyQuestion().options : [] })} className="rounded border-line">
                  <option value="SINGLE_CHOICE">اختيار واحد</option>
                  <option value="MULTIPLE_CHOICE">اختيارات متعددة</option>
                  <option value="YES_NO">نعم / لا</option>
                  <option value="RATING">تقييم 1-5</option>
                  <option value="TEXT">نص</option>
                </select>
                <label className="flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-bold dark:bg-slate-950">
                  <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(questionIndex, { required: event.target.checked })} className="rounded text-civic focus:ring-civic" />
                  مطلوب
                </label>
              </div>
              {(question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE") ? (
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id || optionIndex} className="flex gap-2">
                      <input value={option.label} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className="min-w-0 flex-1 rounded border-line" placeholder={`خيار ${optionIndex + 1}`} required />
                      <button type="button" onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} className="rounded border border-line px-2 text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateQuestion(questionIndex, { options: [...question.options, { label: "", order: question.options.length }] })} className="rounded border border-line px-3 py-1.5 text-sm font-bold hover:border-civic">إضافة خيار</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded bg-civic px-5 py-2.5 font-black text-white hover:bg-civic/90 disabled:opacity-60">
          <Save className="h-4 w-4" />
          {loading ? "جار الحفظ..." : "حفظ الاستبيان"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-black">الاستبيانات الحالية</h2>
        {sortedSurveys.length === 0 ? <p className="card p-5 text-ink/60">لا توجد استبيانات بعد.</p> : null}
        {sortedSurveys.map((survey) => (
          <article key={survey._id} className="card bg-white p-4 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SurveyStatusBadge status={survey.status} />
                  <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink/60 dark:bg-slate-900 dark:text-slate-300">{Number(survey.totalResponses || 0).toLocaleString("ar-JO")} مشاركة</span>
                </div>
                <h3 className="font-black">{survey.title}</h3>
                {survey.description ? <p className="mt-1 line-clamp-2 text-sm text-ink/65 dark:text-slate-300">{survey.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => edit(survey)} className="rounded border border-line px-3 py-1.5 text-sm font-bold hover:border-civic">تعديل</button>
                {survey.status !== "published" ? <button type="button" onClick={() => void setSurveyStatus(survey, "published")} className="rounded bg-civic px-3 py-1.5 text-sm font-bold text-white">نشر</button> : null}
                {survey.status === "published" ? <button type="button" onClick={() => void setSurveyStatus(survey, "closed")} className="rounded border border-line px-3 py-1.5 text-sm font-bold hover:border-civic">إغلاق</button> : null}
                <button type="button" onClick={() => void archive(survey)} className="inline-flex items-center gap-1 rounded border border-line px-3 py-1.5 text-sm font-bold text-red-700 hover:border-red-300">
                  <Archive className="h-4 w-4" />
                  أرشفة
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
