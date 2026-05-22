"use client";

import { Clock, CheckCircle2, Archive, Lock, Radio } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";

const labels: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    draft: "مسودة",
    upcoming: "قادم",
    open: "مفتوح",
    closed: "مغلق",
    archived: "مؤرشف",
    deleted: "محذوف"
  },
  en: {
    draft: "Draft",
    upcoming: "Upcoming",
    open: "Open",
    closed: "Closed",
    archived: "Archived",
    deleted: "Deleted"
  }
};

const styles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  upcoming: "bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-100",
  open: "bg-civic/10 text-civic dark:bg-emerald-200/12 dark:text-emerald-100",
  closed: "bg-clay/10 text-clay dark:bg-orange-300/15 dark:text-orange-100",
  archived: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  deleted: "bg-red-100 text-red-700 dark:bg-red-300/15 dark:text-red-100"
};

const icons: Record<string, typeof Clock> = {
  draft: Clock,
  upcoming: Clock,
  open: Radio,
  closed: Lock,
  archived: Archive,
  deleted: Archive
};

export default function SurveyStatusBadge({ status }: { status?: string | null }) {
  const { language } = useTranslation();
  const value = status || "draft";
  const Icon = icons[value] || CheckCircle2;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${styles[value] || styles.draft}`}>
      <Icon className="h-3.5 w-3.5" />
      {labels[language][value] || value}
    </span>
  );
}
