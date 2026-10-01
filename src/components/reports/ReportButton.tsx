"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Flag, X } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { useDialog } from "@/lib/useDialog";
type ReportTargetType = "post" | "poll" | "comment" | "party" | "user";

export default function ReportButton({ targetType, targetId, compact = false }: { targetType: ReportTargetType; targetId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const { showToast } = useToast();
  const { t, language, dir } = useTranslation();
  useDialog(open, panel, () => setOpen(false));
  const reasons = language === "ar" ? ["محتوى مسيء", "خطاب كراهية", "معلومات مضللة", "رسائل مزعجة", "سبب آخر"] : ["Abuse", "Hate speech", "Misinformation", "Spam", "Other"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType, targetId, reason: String(formData.get("reason") || "other"), details: String(formData.get("details") || "") }) });
      const json = await response.json();
      if (response.status === 401) { setLoginOpen(true); return; }
      if (!response.ok || !json.ok) { setError(json.error?.message || t("common.error")); return; }
      showToast(t("social.reportSent"), "success"); setOpen(false);
    } catch { setError(t("common.connectionFailed")); }
    finally { setPending(false); }
  }
  return <>
    <button type="button" onClick={event => { event.currentTarget.focus(); setError(""); setOpen(true); }} aria-label={t("social.report")} aria-haspopup="dialog" aria-expanded={open} className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm text-slate-600 hover:bg-civic/10 hover:text-civic dark:text-slate-300 ${compact ? "h-11 w-11 shrink-0" : "px-3"}`}>
      <Flag className="h-4 w-4" aria-hidden="true"/>{compact ? null : t("social.report")}
    </button>
    {open ? createPortal(<div className="fixed inset-0 z-[80] grid place-items-center bg-ink/60 p-3 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} dir={dir} onSubmit={submit} className="card w-full max-w-md space-y-4 p-5 outline-none">
        <div className="flex items-center justify-between gap-3"><h2 id={titleId} className="text-xl font-bold">{t("social.report")}</h2><button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="focus-ring grid h-11 w-11 place-items-center rounded-full hover:bg-civic/10"><X className="h-5 w-5"/></button></div>
        <label className="grid gap-2 text-sm font-semibold">{t("social.reportReason")}<select name="reason" required className="w-full rounded-xl">{["abuse","hate","misinformation","spam","other"].map((value,i) => <option key={value} value={value}>{reasons[i]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">{t("social.reportDetails")}<textarea name="details" className="w-full rounded-xl" rows={3} maxLength={1000}/></label>
        {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-200">{error}</p> : null}
        <button type="submit" disabled={pending} className="focus-ring min-h-11 w-full rounded-xl bg-civic px-4 font-bold text-white">{pending ? t("common.saving") : t("common.save")}</button>
      </form>
    </div>, document.body) : null}
    <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)}/>
  </>;
}
