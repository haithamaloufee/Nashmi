"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";

export default function ReportButton({ targetType, targetId, compact = false }: { targetType: "post" | "poll" | "comment" | "party"; targetId: string; compact?: boolean }) {
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
    showToast(json.ok ? "تم إرسال البلاغ للمراجعة" : json.error?.message || "تعذر إرسال البلاغ", json.ok ? "success" : "error");
    if (json.ok) setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((value) => !value)}
        type="button"
        className={`${compact ? "h-8 w-8 px-0" : "px-3 py-1.5"} rounded border border-line bg-white text-xs text-ink/70 transition hover:border-civic hover:text-civic`}
        aria-label="إرسال بلاغ"
      >
        <Flag className={`${compact ? "mx-auto" : "ml-1 inline"} h-3.5 w-3.5`} />
        {compact ? null : "بلاغ"}
      </button>
      {open ? (
        <form action={submit} className="absolute left-0 z-30 mt-2 w-72 space-y-2 rounded border border-line bg-white p-3 shadow-soft">
          <select name="reason" className="w-full rounded border-line text-sm">
            <option value="spam">محتوى مزعج</option>
            <option value="abuse">إساءة</option>
            <option value="misinformation">معلومات مضللة</option>
            <option value="hate">خطاب كراهية</option>
            <option value="other">أخرى</option>
          </select>
          <textarea name="details" className="w-full rounded border-line text-sm" rows={2} placeholder="تفاصيل اختيارية" />
          <button className="rounded bg-civic px-3 py-1.5 text-sm text-white">إرسال</button>
        </form>
      ) : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
