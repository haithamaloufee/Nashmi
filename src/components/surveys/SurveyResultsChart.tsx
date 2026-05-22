"use client";

import { Trophy } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";

type BarItem = {
  id?: string;
  label: string;
  count: number;
  percentage: number;
};

export default function SurveyResultsChart({ items }: { items: BarItem[] }) {
  const { language, t } = useTranslation();
  const sortedItems = [...items].sort((a, b) => b.count - a.count || b.percentage - a.percentage || a.label.localeCompare(b.label));
  const leadingCount = sortedItems[0]?.count || 0;

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/80">
      {sortedItems.map((item, index) => {
        const percentage = Math.max(0, Math.min(100, item.percentage));
        const isLeader = leadingCount > 0 && index === 0;
        return (
          <div key={item.id || item.label} className={`px-3 py-3 ${isLeader ? "bg-civic/5 dark:bg-emerald-200/8" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-words text-sm font-bold text-slate-950 dark:text-white">{item.label}</span>
                  {isLeader ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-civic/10 px-2 py-0.5 text-[11px] font-black text-civic dark:bg-emerald-200/12 dark:text-emerald-100">
                      <Trophy className="h-3 w-3" />
                      {t("survey.topChoice")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {formatNumber(item.count, language)} {t("survey.responses")}
                </p>
              </div>
              <span dir="ltr" className="shrink-0 text-sm font-black text-civic dark:text-emerald-200">
                {formatNumber(percentage, language)}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`${item.label}: ${percentage}%`}>
              <div className={`h-full rounded-full transition-all duration-300 ${isLeader ? "bg-civic dark:bg-emerald-300" : "bg-slate-400 dark:bg-slate-500"}`} style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
