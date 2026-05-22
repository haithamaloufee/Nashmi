"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type ComposerModalShellProps = {
  open: boolean;
  titleKey: TranslationKey;
  dirty: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function ComposerModalShell({ open, titleKey, dirty, onClose, children }: ComposerModalShellProps) {
  const { dir, t } = useTranslation();
  const titleId = useId();
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) {
      setShowDiscardPrompt(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!open) {
      setShowDiscardPrompt(false);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/62 px-3 py-4 backdrop-blur-sm sm:px-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir={dir}
        className="relative flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.35rem] border border-line bg-[#fffaf1] text-ink shadow-[0_28px_90px_rgba(15,23,42,0.34)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line/80 px-4 py-3 dark:border-slate-700 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-black sm:text-xl">
              {t(titleKey)}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("common.close")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink/70 shadow-sm hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {showDiscardPrompt ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-[0_-10px_30px_rgba(146,64,14,0.08)] dark:border-amber-400/30 dark:bg-amber-950/35 dark:text-amber-100 sm:px-5">
            <p className="font-black">{t("common.unsavedChangesTitle")}</p>
            <p className="mt-1 leading-6">{t("common.unsavedChangesDescription")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardPrompt(false)}
                className="rounded border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:border-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {t("common.keepEditing")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                {t("common.discardChanges")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
