"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

export default function ReportButton({ targetType, targetId }: { targetType: "post" | "poll" | "comment" | "party"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");

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
    setMessage(json.ok ? "تم إرسال البلاغ للمراجعة" : json.error?.message || "تعذر إرسال البلاغ");
    if (json.ok) setOpen(false);
  }

  return (
    <div className="inline-block">
      <button onClick={() => setOpen((value) => !value)} type="button" className="rounded border border-line px-3 py-1.5 text-xs">
        <Flag className="ml-1 inline h-3.5 w-3.5" />
        بلاغ
      </button>
      {open ? (
        <form action={submit} className="mt-2 space-y-2 rounded border border-line bg-white p-3">
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
      {message ? <p className="mt-2 text-xs text-ink/60">{message}</p> : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
