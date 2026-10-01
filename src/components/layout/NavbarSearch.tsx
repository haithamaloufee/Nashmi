"use client";
import { Search } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function NavbarSearch() {
  const { t } = useTranslation();
  return <form action="/updates" role="search" aria-label={t("common.search")} className="social-search relative min-w-0 flex-1 lg:w-52 lg:flex-none xl:w-64">
    <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3 h-5 w-5 text-ink/60" />
    <input type="search" name="search" aria-label={t("common.search")} placeholder={t("common.search")} className="social-search-input w-full pe-3 ps-10" />
  </form>;
}
