"use client";

import { Search } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

export function TranslatedSearchInput({ name = "search", defaultValue = "", placeholderKey, className = "w-64" }: { name?: string; defaultValue?: string; placeholderKey: TranslationKey; className?: string }) {
  const { t } = useTranslation();
  return <span className={`social-search relative block max-w-full ${className}`}>
    <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3 h-5 w-5 text-ink/60" />
    <input type="search" name={name} defaultValue={defaultValue} className="social-search-input w-full ps-10 pe-4" placeholder={t(placeholderKey)} aria-label={t(placeholderKey)} />
  </span>;
}

export function SearchSubmitButton({ labelKey = "common.search" }: { labelKey?: TranslationKey }) {
  const { t } = useTranslation();
  return (
    <button type="submit" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic text-white hover:bg-civic/90" aria-label={t(labelKey)}>
      <Search className="h-4 w-4" />
    </button>
  );
}
