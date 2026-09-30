"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, RefreshCw } from "lucide-react";

type AdminNews = {
  _id: string;
  titleAr: string;
  summaryAr: string;
  category: string;
  urgency: string;
  status: "published" | "hidden";
  publishedAt: string;
  sources: Array<{ title: string; url: string; publisher: string }>;
};

export default function NewsAdminClient({ initialItems, initialState }: { initialItems: AdminNews[]; initialState: any }) {
  const [items, setItems] = useState(initialItems);
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const funnel = state?.lastStats?.rejectionReasons;

  async function loadDiagnostics(q = "") {
    const response = await fetch(`/api/admin/news/diagnostics?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (response.ok && json?.ok) setDiagnostics(json.data);
  }

  useEffect(() => { void loadDiagnostics(); }, []);

  async function toggle(item: AdminNews) {
    setBusy(item._id);
    const response = await fetch(`/api/admin/news/${item._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden: item.status !== "hidden" }) });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok || !json.ok) return setMessage("تعذر تحديث حالة الخبر.");
    setItems((current) => current.map((entry) => entry._id === item._id ? json.data.item : entry));
  }

  async function refreshBatch() {
    setBusy("refresh");
    setMessage(null);
    const response = await fetch("/api/admin/news/refresh", { method: "POST" });
    const json = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok || !json.ok) return setMessage(json.error?.message || "تعذر تحديث الأخبار.");
    setState({ ...(state || {}), lastStatus: json.data.stats.dryRun ? "dry_run" : "success", lastStats: json.data.stats, lastDryRunCandidates: json.data.preview });
    void loadDiagnostics(candidateQuery);
    setMessage(json.data.stats.dryRun ? `اكتملت المعاينة الآمنة: ${json.data.stats.selected} خبر مختار، بدون نشر.` : `اكتمل التحديث: ${json.data.stats.created} خبر في الدفعة الجديدة.`);
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-2xl font-black">الأخبار الحية</h1><p className="mt-1 text-sm text-ink/60">مراجعة المصادر وإخفاء العناصر. التحديث اليدوي ينشئ دفعة جديدة في الإنتاج، ويظل معاينة آمنة في Preview.</p></div>
          <button type="button" onClick={refreshBatch} disabled={busy === "refresh"} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} />تحديث الأخبار الآن</button>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><b>آخر حالة</b><p>{state?.lastStatus || "لم يبدأ"}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><b>آخر تشغيل</b><p>{state?.lastCompletedAt ? new Date(state.lastCompletedAt).toLocaleString("ar-JO") : "—"}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><b>النتيجة</b><p>{state?.lastStats ? `${state.lastStats.created || 0} منشور / ${state.lastStats.discovered || 0} مرشح` : "—"}</p></div>
        </div>
        {funnel?.rawFeedItems !== undefined ? (
          <div className="mt-3 rounded-xl border border-line p-3 text-sm">
            <p className="font-bold">مسار آخر تحديث</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink/70">
              <span>رؤيا: {funnel.publisherRaw?.roya ?? 0} وارد / {funnel.publisherTopicMatches?.roya ?? 0} مطابق</span>
              <span>المملكة: {funnel.publisherRaw?.mamlaka ?? 0} وارد / {funnel.publisherTopicMatches?.mamlaka ?? 0} مطابق</span>
              <span>ضمن 7 أيام: {funnel.afterAgeWindow}</span>
              <span>بعد حذف التكرار: {funnel.afterExactDedupe}</span>
              <span>بعد الاستبعاد الواضح: {funnel.afterHardExclusions}</span>
              <span>مطابق للمواضيع: {funnel.positiveTopicMatches}</span>
              <span>إلى Gemini: {funnel.geminiInputCount}</span>
              <span>مختار: {funnel.selectedCount}</span>
            </div>
          </div>
        ) : null}
        {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-civic">{message}</p> : null}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-black">تشخيص الرصد الجديد</h2>
        <p className="mt-1 text-sm text-ink/60">المواد المرصودة لا تظهر في الشريط حتى تُختار وتُنشر في دفعة معتمدة.</p>
        <div className="mt-3 flex gap-2">
          <input className="input flex-1" value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="ابحث بالرابط أو عنوان الناشر" aria-label="البحث عن خبر مرصود" />
          <button type="button" className="btn-primary" onClick={() => void loadDiagnostics(candidateQuery)}>بحث</button>
        </div>
        {diagnostics ? <>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {diagnostics.candidateCounts?.map((entry: any) => <span key={`candidate-${entry._id}`} className="rounded-lg bg-slate-50 p-2">مواد {entry._id}: {entry.count}</span>)}
            {diagnostics.eventCounts?.map((entry: any) => <span key={`event-${entry._id}`} className="rounded-lg bg-slate-50 p-2">أحداث {entry._id}: {entry.count}</span>)}
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(diagnostics.state?.pipelineSourceHealth || {}).map(([id, health]: [string, any]) => <div key={id} className="rounded-lg border border-line p-3"><b>{id}</b><p>{health.ok ? "سليم" : `تعذر الفحص: ${health.failure || "غير معروف"}`}</p><p>آخر فحص: {health.lastCheckedAt ? new Date(health.lastCheckedAt).toLocaleString("ar-JO") : "—"}</p><p>{health.found || 0} مرصود / {health.created || 0} جديد / {health.duplicates || 0} مكرر / {health.eligible || 0} مؤهل</p></div>)}
          </div>
          <p className="mt-3 text-sm">آخر اختيار تجريبي: {diagnostics.state?.pipelineLastEditorialStats?.selected ?? "—"} مختار؛ المنشور فعليًا: {diagnostics.state?.pipelineLastEditorialStats?.published ?? "—"}</p>
          <div className="mt-3 max-h-96 space-y-2 overflow-auto">
            {diagnostics.candidates?.map((candidate: any) => <div key={candidate._id} className="rounded-lg border border-line p-3 text-sm"><a href={candidate.originalUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-civic hover:underline">{candidate.originalTitle}</a><p>{candidate.sourceId} · {candidate.status} · {new Date(candidate.publishedAt).toLocaleString("ar-JO")}</p>{candidate.reason ? <p>السبب: {candidate.reason}</p> : null}<p>الأحداث المرتبطة: {candidate.eventIds?.length || 0}</p></div>)}
          </div>
          <h3 className="mt-5 font-bold">الأحداث المستخرجة وأدلتها</h3>
          <div className="mt-2 max-h-96 space-y-2 overflow-auto">
            {diagnostics.events?.map((event: any) => <div key={event._id} className="rounded-lg border border-line p-3 text-sm"><p className="font-bold">{event.titleAr}</p><p>{diagnostics.state?.pipelineLastEditorialStats?.selectedEventIds?.includes(event._id) && event.status === "eligible" ? "مختار في المعاينة · " : ""}{event.status} · {event.actionStage} · {event.verification}</p>{event.reason ? <p>السبب: {event.reason}</p> : null}<p>الأدلة: {event.evidence?.length || 0}</p></div>)}
          </div>
        </> : <p className="mt-3 text-sm text-ink/60">لا تتوفر بيانات تشخيص بعد.</p>}
      </section>

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item._id} className={`card p-5 ${item.status === "hidden" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-4xl"><div className="text-xs font-bold text-civic">{item.category} · {new Date(item.publishedAt).toLocaleString("ar-JO")}</div><h2 className="mt-1 text-lg font-black">{item.titleAr}</h2><p className="mt-2 leading-7 text-ink/70">{item.summaryAr}</p></div>
              <button type="button" disabled={busy === item._id} onClick={() => toggle(item)} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold hover:border-civic disabled:opacity-50">
                {item.status === "hidden" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{item.status === "hidden" ? "إظهار" : "إخفاء"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{item.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-civic hover:underline">{source.publisher}<ExternalLink className="h-3 w-3" /></a>)}</div>
          </article>
        ))}
        {!items.length ? <div className="card p-8 text-center text-ink/60">لا توجد أخبار منشورة بعد. شغّل معاينة التحديث أولاً.</div> : null}
      </div>
    </div>
  );
}
