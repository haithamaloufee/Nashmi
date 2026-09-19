"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function PasswordActionForm({ token, kind }: { token: string; kind: "reset" | "setup" }) {
  const { language } = useTranslation();
  const en = language === "en";
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || loading) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) { setMessage(en ? "Passwords do not match." : "كلمتا المرور غير متطابقتين."); return; }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) { setMessage(en ? "Use 12+ characters with upper/lowercase letters, a number, and a symbol." : "استخدم 12 حرفًا على الأقل مع حرف كبير وصغير ورقم ورمز."); return; }
    setLoading(true); setMessage("");
    try {
      const response = await fetch(kind === "reset" ? "/api/auth/reset-password" : "/api/auth/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(json.error?.message || (en ? "Unable to save the password." : "تعذر حفظ كلمة المرور.")); else setDone(true);
    } catch { setMessage(en ? "Unable to connect. Try again." : "تعذر الاتصال. حاول مرة أخرى."); } finally { setLoading(false); }
  }

  const title = kind === "reset" ? (en ? "Reset your password" : "إعادة تعيين كلمة المرور") : (en ? "Set up your account" : "إعداد الحساب");
  return (
    <section className="card w-full max-w-lg space-y-5 p-6 sm:p-8" aria-labelledby="password-action-title">
      <h1 id="password-action-title" className="text-2xl font-black">{title}</h1>
      {done ? <div className="space-y-4" role="status"><p className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{en ? "Your password was saved. Previous sessions are no longer valid." : "تم حفظ كلمة المرور وإبطال الجلسات السابقة."}</p><Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-civic px-5 font-bold text-white">{en ? "Go to login" : "الانتقال إلى تسجيل الدخول"}</Link></div> : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm leading-7 text-ink/70 dark:text-slate-300">{en ? "Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol." : "استخدم 12 حرفًا على الأقل، مع حرف كبير وصغير ورقم ورمز."}</p>
          <label className="block space-y-2"><span className="font-semibold">{en ? "New password" : "كلمة المرور الجديدة"}</span><span className="relative block"><input name="password" type={visible ? "text" : "password"} autoComplete="new-password" required className="w-full rounded-xl border-line pe-12" /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 end-2 grid w-10 place-items-center" aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          <label className="block space-y-2"><span className="font-semibold">{en ? "Confirm password" : "تأكيد كلمة المرور"}</span><input name="confirmation" type={visible ? "text" : "password"} autoComplete="new-password" required className="w-full rounded-xl border-line" /></label>
          {message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p> : null}
          <button disabled={loading || !token} className="min-h-11 w-full rounded-xl bg-civic px-5 font-bold text-white disabled:opacity-50">{loading ? (en ? "Saving…" : "جارٍ الحفظ…") : (en ? "Save password" : "حفظ كلمة المرور")}</button>
          {!token ? <p className="text-sm text-red-700">{en ? "The link is missing its secure token." : "الرابط لا يحتوي على الرمز الآمن."}</p> : null}
        </form>
      )}
    </section>
  );
}
