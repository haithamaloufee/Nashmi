"use client";

import { useState } from "react";
import { ReportModerationForm } from "@/components/dashboard/Forms";
import { useTranslation } from "@/components/i18n/LanguageProvider";

type ManagedReport = { _id: string; status: string; targetType: string; reason: string; details?: string };

export default function ReportsList({ reports: initialReports, status }: { reports: ManagedReport[]; status: string }) {
  const [reports, setReports] = useState(initialReports);
  const { language } = useTranslation();
  const english = language === "en";
  const labels: Record<string, string> = english
    ? { open: "Open", dismissed: "Dismissed", action_taken: "Action taken", reviewed: "Reviewed" }
    : { open: "مفتوح", dismissed: "مرفوض", action_taken: "تم الإجراء", reviewed: "تمت المراجعة" };
  const visible = reports.filter(report => status === "all" || report.status === status);
  return <div className="space-y-4">
    <p className="text-sm text-ink/70">{english ? "Results" : "النتائج"}: <b className="text-ink">{visible.length}</b></p>
    {visible.length === 0 ? <div className="rounded border border-line bg-slate-50 p-5 text-sm text-ink/70">{english ? "No matching reports." : "لا توجد بلاغات مطابقة."}</div> : null}
    {visible.map(report => <div key={report._id} className="rounded border border-line p-4">
      <div className="mb-3 text-sm text-ink/70">{report.targetType} · {report.reason} · {labels[report.status] || report.status}</div>
      {report.details ? <p className="mb-3">{report.details}</p> : <p className="mb-3 text-sm text-ink/60">{english ? "No additional details." : "لا توجد تفاصيل إضافية."}</p>}
      <ReportModerationForm reportId={report._id} onApplied={updated => setReports(previous => previous.map(item => item._id === updated._id ? { ...item, ...updated } : item))} />
    </div>)}
  </div>;
}
