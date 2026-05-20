"use client";

import { useTranslation } from "@/components/i18n/LanguageProvider";
import { getLocalizedValue } from "@/lib/localization";

export default function LocalizedValue({ item, baseKey, fallbackKey, className }: { item: Record<string, unknown>; baseKey: string; fallbackKey?: string; className?: string }) {
  const { language } = useTranslation();
  return <span className={className}>{getLocalizedValue(item, baseKey, language, fallbackKey)}</span>;
}
