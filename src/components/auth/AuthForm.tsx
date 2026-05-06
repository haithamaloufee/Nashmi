"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(value: string) {
  const clean = value.trim();
  if (!clean) return "الاسم مطلوب ولا يمكن أن يكون فارغا.";
  if (clean.length < 2) return "اكتب اسما من حرفين على الأقل.";
  if (clean.length > 80) return "الاسم طويل جدا.";
  return "";
}

function validateEmail(value: string) {
  const clean = value.trim();
  if (!clean) return "البريد الإلكتروني مطلوب.";
  if (/\s/.test(value)) return "البريد الإلكتروني لا يقبل المسافات.";
  if (!emailPattern.test(clean)) return "اكتب بريدا إلكترونيا صحيحا، مثل name@example.com.";
  return "";
}

function validatePassword(value: string) {
  if (!value.trim()) return "كلمة المرور مطلوبة.";
  if (/\s/.test(value)) return "كلمة المرور لا تقبل المسافات.";
  if (value.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
  if (value.length > 128) return "كلمة المرور طويلة جدا.";
  return "";
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const errors = useMemo<FieldErrors>(() => {
    return {
      name: mode === "signup" ? validateName(values.name) : "",
      email: validateEmail(values.email),
      password: validatePassword(values.password)
    };
  }, [mode, values]);

  const hasErrors = Boolean(errors.email || errors.password || (mode === "signup" && errors.name));
  const hasVisibleErrors = hasErrors && Object.values(touched).some(Boolean);

  function updateField(field: "name" | "email" | "password", value: string) {
    const nextValue = field === "email" ? value.trim() : value;
    setValues((current) => ({ ...current, [field]: nextValue }));
    setTouched((current) => ({ ...current, [field]: true }));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setTouched({ name: true, email: true, password: true });
    if (hasErrors) return;

    setLoading(true);
    setError("");
    const payload: Record<string, string> = {
      email: values.email.trim(),
      password: values.password
    };
    if (mode === "signup") payload.name = values.name.trim();

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!json.ok) {
        setError(json.error?.message || "تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى بعد قليل.");
    } finally {
      setLoading(false);
    }
  }

  function fieldMessage(field: keyof FieldErrors) {
    return touched[field] && errors[field] ? <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-300">{errors[field]}</p> : null;
  }

  return (
    <form onSubmit={submit} noValidate className="card mx-auto mt-10 max-w-md space-y-5 p-5 sm:p-6">
      <div>
        <h1 className="text-3xl font-black leading-tight">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب مواطن"}</h1>
        <p className="mt-2 text-sm text-ink/70 dark:text-slate-300">يتم حفظ الجلسة في Cookie آمن HttpOnly ولا تستخدم المنصة localStorage للتوكنات.</p>
      </div>
      {mode === "signup" ? (
        <label className="block text-sm font-medium">
          الاسم
          <input
            name="name"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, name: true }))}
            className="mt-1 w-full rounded-xl border border-line bg-white/95 px-4 py-3 text-sm text-ink focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-[#101820] dark:text-white"
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby="name-error"
            autoComplete="name"
          />
          <span id="name-error">{fieldMessage("name")}</span>
        </label>
      ) : null}
      <label className="block text-sm font-medium">
        البريد الإلكتروني
        <input
          name="email"
          type="email"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          className="mt-1 w-full rounded-xl border border-line bg-white/95 px-4 py-3 text-sm text-ink focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-[#101820] dark:text-white"
          aria-invalid={Boolean(touched.email && errors.email)}
          aria-describedby="email-error"
          autoComplete="email"
          inputMode="email"
        />
        <span id="email-error">{fieldMessage("email")}</span>
      </label>
      <label className="block text-sm font-medium">
        كلمة المرور
        <span className="relative mt-1 block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            className="w-full rounded-xl border border-line bg-white/95 px-4 py-3 pe-14 text-sm text-ink focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-[#101820] dark:text-white"
            aria-invalid={Boolean(touched.password && errors.password)}
            aria-describedby="password-error"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="focus-ring absolute inset-y-0 end-3 grid h-full w-11 place-items-center rounded-full text-ink/55 hover:bg-civic/10 hover:text-civic dark:text-white/62 dark:hover:text-emerald-200"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
        <span id="password-error">{fieldMessage("password")}</span>
      </label>
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/20 dark:text-red-200" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading || hasVisibleErrors}
        className="w-full rounded-2xl bg-civic px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-200 dark:text-[#101820] dark:hover:bg-emerald-100"
      >
        {loading ? "جار التنفيذ..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
      </button>
    </form>
  );
}
