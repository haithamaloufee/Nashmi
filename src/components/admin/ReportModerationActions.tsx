"use client";

import { useState } from "react";

const actions = {
  hide: "إخفاء الهدف",
  dismiss_report: "رفض البلاغ"
} as const;

type Action = keyof typeof actions;

export default function ReportModerationActions({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(action: Action) {
    const confirmed = window.confirm(action === "hide" ? "تأكيد إخفاء المحتوى المرتبط بهذا البلاغ؟" : "تأكيد رفض هذا البلاغ؟");
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: actions[action] })
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json.ok) {
        setMessage("تم تحديث البلاغ.");
        window.setTimeout(() => window.location.reload(), 700);
      } else {
        setMessage(json.error?.message || "تعذر تحديث البلاغ");
      }
    } catch {
      setMessage("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {(Object.keys(actions) as Action[]).map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => submit(action)}
          disabled={loading}
          className="rounded border border-line bg-white px-3 py-1 text-sm text-ink hover:bg-ink/5 disabled:opacity-50"
        >
          {actions[action]}
        </button>
      ))}
      {message ? <span className="text-xs text-ink/60">{message}</span> : null}
    </div>
  );
}
