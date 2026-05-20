"use client";

import { Search } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function LawsFilterForm({ search, category, categories }: { search?: string; category?: string; categories: string[] }) {
  const { t } = useTranslation();
  return (
    <form className="my-6 flex flex-wrap gap-2">
      <input name="search" defaultValue={search || ""} className="w-72 rounded border-line focus:border-civic focus:ring-civic" placeholder={t("laws.search")} />
      <select name="category" defaultValue={category || ""} className="rounded border-line focus:border-civic focus:ring-civic">
        <option value="">{t("laws.allCategories")}</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button className="rounded bg-civic px-4 py-2 text-white hover:bg-civic/90" aria-label={t("common.search")}><Search className="h-4 w-4" /></button>
    </form>
  );
}
