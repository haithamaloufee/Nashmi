"use client";
import Link from "next/link";
import Image from "next/image";
import AuthForm from "./AuthForm";
import { useTranslation } from "@/components/i18n/LanguageProvider";
export default function AuthShell({mode}: {mode: "login" | "signup"}) {
  const { t } = useTranslation();
  return <main className="container-page grid min-h-[calc(100vh-var(--navbar-height))] items-center gap-6 py-8 lg:max-w-5xl lg:grid-cols-[1.15fr_1fr] lg:gap-20">
    <section className="space-y-4 text-center lg:text-start">
      <Link href="/welcome" className="focus-ring inline-flex items-center gap-3 rounded-xl text-4xl font-black text-civic dark:text-emerald-200"><Image src="/images/nashmi logo_transparent.png" alt="" width={88} height={88} className="hidden h-20 w-20 object-contain lg:block" />{t("social.brand")}</Link>
      <h2 className="text-xl font-semibold leading-relaxed sm:text-2xl lg:text-3xl">{t("social.authTitle")}</h2>
      <p className="hidden text-sm text-ink/65 lg:block">{t("social.neutral")}</p>
    </section>
    <section className="min-w-0"><AuthForm mode={mode}/><p className="mt-5 text-center text-sm text-ink/65">{t(mode === "login" ? "auth.noAccount" : "auth.haveAccount")} <Link className="focus-ring rounded font-bold text-civic underline underline-offset-4" href={mode === "login" ? "/signup" : "/login"}>{t(mode === "login" ? "auth.signup" : "auth.login")}</Link></p></section>
  </main>;
}
