"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";

type ReportTargetType = "post" | "poll" | "comment" | "party" | "user";

export default function ReportButton({ targetType, targetId, compact = false }: { targetType: ReportTargetType; targetId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { showToast } = useToast();

  async function submit(formData: FormData) {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        reason: String(formData.get("reason") || "other"),
        details: String(formData.get("details") || "")
      })
    });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    showToast(json.ok ? "تم إرسال البلاغ بنجاح" : json.error?.message || "تعذر إرسال البلاغ", json.ok ? "success" : "error");
    if (json.ok) setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((value) => !value)}
        type="button"
        className={`${compact ? "h-8 w-8 px-0" : "px-3 py-1.5"} rounded border border-slate-200 bg-white text-xs text-slate-600 transition hover:border-civic hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-300 dark:hover:text-emerald-200`}
        aria-label={targetType === "user" ? "إبلاغ عن المستخدم" : "إرسال بلاغ"}
      >
        <Flag className={`${compact ? "mx-auto" : "ml-1 inline"} h-3.5 w-3.5`} />
        {compact ? null : targetType === "user" ? "إبلاغ عن المستخدم" : "بلاغ"}
      </button>
      {open ? (
        <form action={submit} className="absolute left-0 z-30 mt-2 w-72 space-y-2 rounded border border-slate-200 bg-white p-3 text-slate-900 shadow-soft dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
          <select name="reason" required className="w-full rounded border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <option value="abuse">محتوى مسيء</option>
            <option value="other">انتحال شخصية</option>
            <option value="hate">خطاب كراهية</option>
            <option value="misinformation">معلومات مضللة</option>
            <option value="spam">سبام</option>
            <option value="other">سبب آخر</option>
          </select>
          <textarea name="details" className="w-full rounded border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" rows={2} maxLength={1000} placeholder="تفاصيل اختيارية" />
          <button className="rounded bg-civic px-3 py-1.5 text-sm font-semibold text-white hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]">إرسال</button>
        </form>
      ) : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
