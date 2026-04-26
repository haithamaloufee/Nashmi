"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const payload: Record<string, string> = {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || "")
    };
    if (mode === "signup") payload.name = String(formData.get("name") || "");
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error?.message || "تعذر تنفيذ العملية");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form action={submit} className="card mx-auto mt-10 max-w-md space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب مواطن"}</h1>
        <p className="mt-2 text-sm text-ink/60">يتم حفظ الجلسة في Cookie آمن HttpOnly ولا تستخدم المنصة localStorage للتوكنات.</p>
      </div>
      {mode === "signup" ? (
        <label className="block text-sm font-medium">
          الاسم
          <input name="name" className="mt-1 w-full rounded border-line" required minLength={2} />
        </label>
      ) : null}
      <label className="block text-sm font-medium">
        البريد الإلكتروني
        <input name="email" type="email" className="mt-1 w-full rounded border-line" required />
      </label>
      <label className="block text-sm font-medium">
        كلمة المرور
        <input name="password" type="password" className="mt-1 w-full rounded border-line" required minLength={8} />
      </label>
      {error ? <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <button disabled={loading} className="w-full rounded bg-civic px-4 py-2 font-semibold text-white disabled:opacity-60">
        {loading ? "جار التنفيذ..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
      </button>
    </form>
  );
}
