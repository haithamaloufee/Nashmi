"use client";

import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useTranslation();
  const isArabic = language === "ar";

  return (
    <button
      type="button"
      onClick={() => setLanguage(isArabic ? "en" : "ar")}
      className="focus-ring inline-flex h-9 items-center gap-1 rounded-full border border-line bg-white/75 p-1 text-xs font-black text-ink shadow-sm transition hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-300 dark:hover:text-emerald-100"
      aria-label={t("language.toggle")}
      title={t("language.toggle")}
      data-no-route-transition="true"
    >
      <span className={`rounded-full px-2 py-1 transition ${isArabic ? "bg-civic text-white dark:bg-emerald-200 dark:text-[#101820]" : "text-ink/55 dark:text-slate-400"}`}>AR</span>
      <span className={`rounded-full px-2 py-1 transition ${!isArabic ? "bg-civic text-white dark:bg-emerald-200 dark:text-[#101820]" : "text-ink/55 dark:text-slate-400"}`}>EN</span>
      {compact ? <span className="sr-only">{t("language.current")}</span> : null}
    </button>
  );
}
