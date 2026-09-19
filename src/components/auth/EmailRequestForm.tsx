"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LanguageProvider";

type Props = { kind: "forgot" | "resend"; initialEmail?: string };

export default function EmailRequestForm({ kind, initialEmail = "" }: Props) {
  const { language } = useTranslation();
  const en = language === "en";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const endpoint = kind === "forgot" ? "/api/auth/request-password-reset" : "/api/auth/resend-verification";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const json = await response.json().catch(() => ({}));
      setMessage(response.ok ? (json.data?.message || (en ? "Check your email for the next step." : "تحقق من بريدك لإكمال الخطوة التالية.")) : (json.error?.message || (en ? "Unable to process the request." : "تعذر تنفيذ الطلب.")));
    } catch {
      setMessage(en ? "Unable to connect. Please try again." : "تعذر الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  const title = kind === "forgot" ? (en ? "Forgot your password?" : "نسيت كلمة المرور؟") : (en ? "Resend verification email" : "إعادة إرسال رسالة التفعيل");
  const description = kind === "forgot"
    ? (en ? "Enter your email. If an account exists, we will send a one-time reset link." : "أدخل بريدك. إذا كان الحساب موجودًا فسنرسل رابطًا آمنًا لمرة واحدة.")
    : (en ? "Enter the email used during registration. The response remains private whether or not an account exists." : "أدخل البريد المستخدم في التسجيل. تبقى الاستجابة آمنة سواء كان الحساب موجودًا أم لا.");

  return (
    <section className="card w-full max-w-lg space-y-5 p-6 sm:p-8" aria-labelledby="email-action-title">
      <div><h1 id="email-action-title" className="text-2xl font-black">{title}</h1><p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-300">{description}</p></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">{en ? "Email" : "البريد الإلكتروني"}<input name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border-line" /></label>
        {message ? <p className="rounded-xl bg-civic/10 p-4 text-sm leading-6 text-ink dark:text-slate-100" role="status" aria-live="polite">{message}</p> : null}
        <button disabled={loading} className="min-h-11 w-full rounded-xl bg-civic px-5 font-bold text-white disabled:opacity-60">{loading ? (en ? "Sending…" : "جارٍ الإرسال…") : (en ? "Send instructions" : "إرسال التعليمات")}</button>
      </form>
      <Link href="/login" className="inline-flex font-semibold text-civic hover:underline">{en ? "Back to login" : "العودة إلى تسجيل الدخول"}</Link>
    </section>
  );
}
