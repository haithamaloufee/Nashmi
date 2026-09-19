"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SetPasswordPage() {
  const token = useSearchParams().get("token") || "";
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if (password !== String(form.get("confirmation") || "")) {
      setMessage("كلمتا المرور غير متطابقتين");
      setLoading(false);
      return;
    }
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(json.error?.message || "تعذر إعداد كلمة المرور");
      return;
    }
    setDone(true);
  }

  return (
    <main className="container-page grid min-h-[65vh] place-items-center py-10">
      <section className="card w-full max-w-lg space-y-5 p-6 sm:p-8" aria-labelledby="set-password-title">
        <h1 id="set-password-title" className="text-2xl font-black">إعداد كلمة المرور</h1>
        {done ? (
          <div className="space-y-4" role="status">
            <p className="rounded-xl bg-emerald-50 p-4 text-emerald-900">تم إعداد كلمة المرور بنجاح.</p>
            <Link href="/login" className="focus-ring inline-flex min-h-11 items-center rounded-lg bg-civic px-5 font-bold text-white">الانتقال إلى تسجيل الدخول</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm leading-7 text-ink/70">اختر كلمة مرور فريدة من 12 حرفًا على الأقل، تتضمن حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا.</p>
            <label className="block space-y-2"><span className="font-semibold">كلمة المرور الجديدة</span><input name="password" type="password" autoComplete="new-password" minLength={12} required className="w-full rounded-lg border-line" /></label>
            <label className="block space-y-2"><span className="font-semibold">تأكيد كلمة المرور</span><input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className="w-full rounded-lg border-line" /></label>
            {message ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p> : null}
            <button disabled={loading || !token} className="min-h-11 w-full rounded-lg bg-civic px-5 font-bold text-white disabled:opacity-50">{loading ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
