import type { ReactNode } from "react";
import { I18nText } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

export default function StatCard({ label, labelKey, value }: { label?: ReactNode; labelKey?: TranslationKey; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink/60">{labelKey ? <I18nText id={labelKey} /> : label}</div>
      <div className="mt-2 text-3xl font-bold text-civic">{value}</div>
    </div>
  );
}
