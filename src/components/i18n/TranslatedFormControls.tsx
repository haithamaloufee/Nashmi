"use client";

import { Search } from "lucide-react";
import SearchField from "@/components/ui/SearchField";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

export function TranslatedSearchInput({ name = "search", defaultValue = "", placeholderKey, className = "w-64" }: { name?: string; defaultValue?: string; placeholderKey: TranslationKey; className?: string }) {
  const { t } = useTranslation();
  return <SearchField name={name} defaultValue={defaultValue} className={className} placeholder={t(placeholderKey)} label={t(placeholderKey)} />;
}

export function SearchSubmitButton({ labelKey = "common.search" }: { labelKey?: TranslationKey }) {
  const { t } = useTranslation();
  return (
    <button type="submit" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic text-white hover:bg-civic/90" aria-label={t(labelKey)}>
      <Search className="h-4 w-4" />
    </button>
  );
}
