"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EmailRequestForm from "@/components/auth/EmailRequestForm";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function VerifyEmailClient({ token, email, sent }: { token: string; email: string; sent: boolean }) {
  const { language } = useTranslation();
  const en = language === "en";
  const started = useRef(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(token ? "loading" : "idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => ({ response, json: await response.json().catch(() => ({})) }))
      .then(({ response, json }) => {
        setStatus(response.ok ? "success" : "error");
        setMessage(response.ok ? (en ? "Your email has been verified. You can now sign in." : "تم تفعيل بريدك. يمكنك الآن تسجيل الدخول.") : (json.error?.message || (en ? "This verification link is invalid or expired." : "رابط التفعيل غير صالح أو منتهي.")));
      })
      .catch(() => { setStatus("error"); setMessage(en ? "Unable to verify the link right now." : "تعذر التحقق من الرابط الآن."); });
  }, [token, en]);

  if (!token) {
    return <div className="w-full max-w-lg space-y-4">{email ? <p className="rounded-xl border border-civic/20 bg-civic/5 p-4 text-sm leading-7">{sent ? (en ? "We sent a verification link. Check your inbox and spam folder." : "أرسلنا رابط التفعيل. تحقق من صندوق الوارد والبريد غير المرغوب.") : (en ? "Your account is pending. Request another verification email below." : "حسابك بانتظار التفعيل. اطلب رسالة تفعيل جديدة أدناه.")}</p> : null}<EmailRequestForm kind="resend" initialEmail={email} /></div>;
  }

  return (
    <section className="card w-full max-w-lg space-y-5 p-6 sm:p-8" aria-live="polite">
      <h1 className="text-2xl font-black">{en ? "Email verification" : "تفعيل البريد الإلكتروني"}</h1>
      {status === "loading" ? <p>{en ? "Verifying your secure link…" : "جارٍ التحقق من الرابط الآمن…"}</p> : <p className={`rounded-xl p-4 ${status === "success" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{message}</p>}
      {status === "success" ? <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-civic px-5 font-bold text-white">{en ? "Sign in" : "تسجيل الدخول"}</Link> : null}
      {status === "error" ? <Link href="/verify-email" className="font-semibold text-civic hover:underline">{en ? "Request a new link" : "طلب رابط جديد"}</Link> : null}
    </section>
  );
}
