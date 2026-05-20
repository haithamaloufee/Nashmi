"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLanguage, isLanguage, translate, type Language, type TranslationKey } from "@/lib/i18n";

const storageKey = "nashmi-language";

type LanguageContextValue = {
  language: Language;
  dir: "rtl" | "ltr";
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyDocumentLanguage(language: Language) {
  const dir = language === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = language;
  document.documentElement.dir = dir;
}

export function LanguageProvider({ children, initialLanguage = defaultLanguage }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [ready, setReady] = useState(initialLanguage !== defaultLanguage);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const next = isLanguage(stored) ? stored : initialLanguage;
    document.cookie = `${storageKey}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    applyDocumentLanguage(next);
    const timer = window.setTimeout(() => {
      setLanguageState(next);
      setReady(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [initialLanguage]);

  const setLanguage = useCallback((next: Language) => {
    setReady(true);
    setLanguageState(next);
    window.localStorage.setItem(storageKey, next);
    document.cookie = `${storageKey}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    applyDocumentLanguage(next);
    window.dispatchEvent(new CustomEvent("nashmi-language-change", { detail: next }));
  }, []);

  const effectiveLanguage = ready ? language : defaultLanguage;

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: effectiveLanguage,
      dir: effectiveLanguage === "ar" ? "rtl" : "ltr",
      setLanguage,
      t: (key) => translate(effectiveLanguage, key)
    }),
    [effectiveLanguage, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: defaultLanguage,
      dir: "rtl" as const,
      setLanguage: () => undefined,
      t: (key: TranslationKey) => translate(defaultLanguage, key)
    };
  }
  return context;
}

export function I18nText({ id }: { id: TranslationKey }) {
  const { t } = useTranslation();
  return <>{t(id)}</>;
}
