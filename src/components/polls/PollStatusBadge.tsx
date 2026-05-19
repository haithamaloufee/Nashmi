"use client";

import { useTranslation } from "@/components/i18n/LanguageProvider";
import { isPollEnded, type PollTimingFields } from "@/lib/polls";

export default function PollStatusBadge({ poll }: { poll: PollTimingFields }) {
  const { t } = useTranslation();
  const ended = isPollEnded(poll);

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${
        ended
          ? "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          : "border-emerald-300/45 bg-emerald-50 text-emerald-700 dark:border-emerald-200/35 dark:bg-emerald-200/12 dark:text-emerald-100"
      }`}
    >
      {ended ? t("poll.ended") : t("poll.open")}
    </span>
  );
}
