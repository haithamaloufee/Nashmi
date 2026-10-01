"use client";

import { SearchSubmitButton, TranslatedSearchInput } from "@/components/i18n/TranslatedFormControls";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function LawsFilterForm({ search, category, categories }: { search?: string; category?: string; categories: string[] }) {
  const { t } = useTranslation();
  return (
    <form className="my-6 flex flex-wrap gap-2">
      <TranslatedSearchInput defaultValue={search || ""} className="w-full sm:w-72" placeholderKey="laws.search" />
      <select
        name="category"
        defaultValue={category || ""}
        aria-label={t("laws.allCategories")}
        className="rounded border-line focus:border-civic focus:ring-civic"
      >
        <option value="">{t("laws.allCategories")}</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <SearchSubmitButton />
    </form>
  );
}
