"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

type LawFormData = {
  _id?: string;
  title?: string;
  slug?: string;
  category?: string;
  sourceName?: string;
  sourceType?: string;
  articleNumber?: string | null;
  officialReferenceUrl?: string | null;
  originalText?: string | null;
  shortDescription?: string;
  simplifiedExplanation?: string;
  practicalExample?: string | null;
  youtubeVideoId?: string | null;
  thumbnailUrl?: string | null;
  tags?: string[];
  status?: "published" | "draft" | "hidden";
};

const inputClass = "w-full rounded border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

function fieldValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseTags(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function LawManagementControls({ mode, law }: { mode: "create" | "edit"; law?: LawFormData }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = mode === "edit";
  const title = isEdit ? "تعديل القانون" : "إضافة قانون";
  const defaultTags = useMemo(() => (law?.tags || []).join(", "), [law?.tags]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      category: formData.get("category"),
      sourceName: formData.get("sourceName"),
      sourceType: formData.get("sourceType"),
      articleNumber: formData.get("articleNumber") || null,
      officialReferenceUrl: formData.get("officialReferenceUrl") || "",
      originalText: formData.get("originalText") || null,
      shortDescription: formData.get("shortDescription"),
      simplifiedExplanation: formData.get("simplifiedExplanation"),
      practicalExample: formData.get("practicalExample") || null,
      youtubeVideoId: formData.get("youtubeVideoId") || null,
      thumbnailUrl: formData.get("thumbnailUrl") || "",
      tags: parseTags(formData.get("tags")),
      status: formData.get("status"),
      changeReason: formData.get("changeReason") || undefined
    };

    setSaving(true);
    try {
      const response = await fetch(isEdit ? `/api/admin/laws/${law?._id}` : "/api/admin/laws", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        showToast(json.error?.message || "تعذر حفظ القانون", "error");
        return;
      }
      showToast(isEdit ? "تم تحديث القانون" : "تمت إضافة القانون", "success");
      setOpen(false);
      router.refresh();
    } catch {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-civic px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-civic/90 active:scale-[0.98] dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
      >
        {isEdit ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {title}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-3 py-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="law-form-title">
          <form onSubmit={submit} className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:p-6" dir="rtl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="law-form-title" className="text-2xl font-black">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">الحقول محفوظة بنفس نموذج القوانين الحالي، والصلاحيات محمية من الخادم.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-civic hover:text-civic dark:border-slate-700 dark:text-slate-300" aria-label="إغلاق نموذج القانون">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              <section className="rounded border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-3 font-black">المعلومات الأساسية</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">العنوان<input name="title" defaultValue={fieldValue(law?.title)} className={inputClass} required /></label>
                  <label className="grid gap-1 text-sm font-semibold">الرابط المختصر slug<input name="slug" defaultValue={fieldValue(law?.slug)} className={inputClass} required dir="ltr" /></label>
                  <label className="grid gap-1 text-sm font-semibold">التصنيف<input name="category" defaultValue={fieldValue(law?.category)} className={inputClass} required /></label>
                  <label className="grid gap-1 text-sm font-semibold">حالة النشر<select name="status" defaultValue={law?.status || "published"} className={inputClass}><option value="published">منشور</option><option value="draft">مسودة</option><option value="hidden">مخفي</option></select></label>
                </div>
              </section>

              <section className="rounded border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-3 font-black">الشرح المبسط</h3>
                <div className="grid gap-3">
                  <label className="grid gap-1 text-sm font-semibold">ملخص قصير<textarea name="shortDescription" defaultValue={fieldValue(law?.shortDescription)} className={inputClass} rows={2} required /></label>
                  <label className="grid gap-1 text-sm font-semibold">شرح مبسط<textarea name="simplifiedExplanation" defaultValue={fieldValue(law?.simplifiedExplanation)} className={inputClass} rows={5} required /></label>
                  <label className="grid gap-1 text-sm font-semibold">مثال عملي<textarea name="practicalExample" defaultValue={fieldValue(law?.practicalExample)} className={inputClass} rows={2} /></label>
                </div>
              </section>

              <section className="rounded border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-3 font-black">النص الأصلي والمصدر</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">اسم المصدر<input name="sourceName" defaultValue={fieldValue(law?.sourceName)} className={inputClass} required /></label>
                  <label className="grid gap-1 text-sm font-semibold">نوع المصدر<input name="sourceType" defaultValue={fieldValue(law?.sourceType)} className={inputClass} required /></label>
                  <label className="grid gap-1 text-sm font-semibold">رقم المادة<input name="articleNumber" defaultValue={fieldValue(law?.articleNumber)} className={inputClass} /></label>
                  <label className="grid gap-1 text-sm font-semibold">الرابط الرسمي<input name="officialReferenceUrl" defaultValue={fieldValue(law?.officialReferenceUrl)} className={inputClass} dir="ltr" /></label>
                </div>
                <label className="mt-3 grid gap-1 text-sm font-semibold">النص الأصلي<textarea name="originalText" defaultValue={fieldValue(law?.originalText)} className={inputClass} rows={5} /></label>
              </section>

              <section className="rounded border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-3 font-black">التصنيف والوسوم</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">وسوم مفصولة بفواصل<input name="tags" defaultValue={defaultTags} className={inputClass} /></label>
                  <label className="grid gap-1 text-sm font-semibold">YouTube ID<input name="youtubeVideoId" defaultValue={fieldValue(law?.youtubeVideoId)} className={inputClass} dir="ltr" /></label>
                  <label className="grid gap-1 text-sm font-semibold md:col-span-2">رابط صورة مصغرة<input name="thumbnailUrl" defaultValue={fieldValue(law?.thumbnailUrl)} className={inputClass} dir="ltr" /></label>
                  {isEdit ? <label className="grid gap-1 text-sm font-semibold md:col-span-2">سبب التعديل<textarea name="changeReason" className={inputClass} rows={2} placeholder="مثال: تحديث صياغة الشرح أو إضافة مصدر رسمي" /></label> : null}
                </div>
              </section>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">إلغاء</button>
              <button type="submit" disabled={saving} className="inline-flex min-w-28 items-center justify-center gap-2 rounded bg-civic px-4 py-2 font-bold text-white hover:bg-civic/90 disabled:opacity-60 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                حفظ
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
