"use client";

import { useEffect, useId, useRef } from "react";
import { Hash, RotateCcw, X } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type FilterOption = {
  value: string;
  labelKey: TranslationKey;
};

type AdvancedSearchModalProps = {
  open: boolean;
  filterOptions: readonly FilterOption[];
  fromDate: string;
  toDate: string;
  filter: string;
  hashtag: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onHashtagChange: (value: string) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
};

export default function AdvancedSearchModal({
  open,
  filterOptions,
  fromDate,
  toDate,
  filter,
  hashtag,
  onFromDateChange,
  onToDateChange,
  onFilterChange,
  onHashtagChange,
  onReset,
  onApply,
  onClose
}: AdvancedSearchModalProps) {
  const { dir, t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-slate-950/62 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:px-6 sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir={dir}
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
        className="relative flex max-h-[min(86vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border border-line bg-[#fffaf1] text-ink shadow-[0_30px_90px_rgba(15,23,42,0.35)] outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:rounded-[1.25rem]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line/80 px-4 py-3 dark:border-slate-700 sm:px-5">
          <h2 id={titleId} className="truncate text-lg font-black sm:text-xl">
            {t("updates.advancedSearch")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink/70 shadow-sm hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold">
              {t("updates.fromDate")}
              <input
                type="date"
                value={fromDate}
                onChange={(event) => onFromDateChange(event.target.value)}
                className="w-full rounded border-line bg-white text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              {t("updates.toDate")}
              <input
                type="date"
                value={toDate}
                onChange={(event) => onToDateChange(event.target.value)}
                className="w-full rounded border-line bg-white text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
              {t("updates.contentType")}
              <select
                value={filter}
                onChange={(event) => onFilterChange(event.target.value)}
                className="w-full rounded border-line bg-white text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white"
              >
                {filterOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
              {t("updates.hashtagSearch")}
              <div className="relative">
                <Hash className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                <input
                  value={hashtag}
                  onChange={(event) => onHashtagChange(event.target.value)}
                  className="w-full rounded border-line bg-white ps-9 text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white"
                  placeholder="#Youth"
                />
              </div>
            </label>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-line/80 bg-white/72 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/72 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <button
            type="button"
            onClick={onReset}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-civic hover:border-civic hover:bg-civic/10 dark:border-slate-700 dark:bg-slate-950 dark:text-emerald-100 dark:hover:border-emerald-200"
          >
            <RotateCcw className="h-4 w-4" />
            {t("common.reset")}
          </button>
          <button
            type="submit"
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-civic px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-civic/90 dark:bg-emerald-200 dark:text-slate-950 dark:hover:bg-emerald-100"
          >
            {t("updates.applySearch")}
          </button>
        </footer>
      </form>
    </div>
  );
}
