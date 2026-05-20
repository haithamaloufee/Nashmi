"use client";

import { Search } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

export function TranslatedSearchInput({ name = "search", defaultValue = "", placeholderKey, className = "w-64" }: { name?: string; defaultValue?: string; placeholderKey: TranslationKey; className?: string }) {
  const { t } = useTranslation();
  return <input name={name} defaultValue={defaultValue} className={`${className} rounded border-line focus:border-civic focus:ring-civic`} placeholder={t(placeholderKey)} />;
}

export function SearchSubmitButton({ labelKey = "common.search" }: { labelKey?: TranslationKey }) {
  const { t } = useTranslation();
  return (
    <button className="rounded bg-civic px-4 py-2 text-white hover:bg-civic/90" aria-label={t(labelKey)}>
      <Search className="h-4 w-4" />
    </button>
  );
}
