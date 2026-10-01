"use client";
import Link from "next/link";
import { MessageCircle, ShieldCheck, Users } from "lucide-react";
import AuthForm from "./AuthForm";
import { useTranslation } from "@/components/i18n/LanguageProvider";
export default function AuthShell({mode}: {mode: "login" | "signup"}) {
  const { t } = useTranslation();
  return <main className="container-page grid min-h-[calc(100vh-110px)] items-center gap-8 py-8 lg:max-w-5xl lg:grid-cols-2 lg:gap-16">
    <section className="space-y-5 text-center lg:text-start">
      <Link href="/" className="inline-block text-4xl font-black text-civic dark:text-emerald-200">{t("social.brand")}</Link>
      <h2 className="text-2xl font-black leading-relaxed sm:text-3xl">{t("social.authTitle")}</h2>
      <p className="max-w-md text-base leading-8 text-ink/70">{t("social.authBody")}</p>
      <div className="hidden gap-3 text-sm font-semibold text-ink/70 lg:grid">{[[ShieldCheck,"social.neutral"],[Users,"social.community"],[MessageCircle,"social.dialogue"]].map(([Icon, key]: any) => <div key={key} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-civic/10 text-civic"><Icon className="h-5 w-5"/></span>{t(key)}</div>)}</div>
    </section>
    <section className="min-w-0"><AuthForm mode={mode}/><p className="mt-5 text-center text-sm text-ink/65">{t(mode === "login" ? "auth.noAccount" : "auth.haveAccount")} <Link className="focus-ring rounded font-bold text-civic underline underline-offset-4" href={mode === "login" ? "/signup" : "/login"}>{t(mode === "login" ? "auth.signup" : "auth.login")}</Link></p></section>
  </main>;
}
