"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";
import { getPollEndDate, isPollEnded, type PollTimingFields } from "@/lib/polls";

function formatRemaining(ms: number, language: "ar" | "en") {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    if (language === "ar") return `${formatNumber(days, language)} أيام و ${formatNumber(hours, language)} ساعات`;
    return `${formatNumber(days, language)} days ${formatNumber(hours, language)} hours`;
  }

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function PollCountdown({ poll, onEnded }: { poll: PollTimingFields; onEnded?: () => void }) {
  const { language, t } = useTranslation();
  const endDate = useMemo(() => getPollEndDate(poll), [poll]);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const ended = isPollEnded(poll, now);

  useEffect(() => {
    setReady(true);
    if (!endDate || ended) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [endDate, ended]);

  useEffect(() => {
    if (ended) onEnded?.();
  }, [ended, onEnded]);

  if (!endDate || !ready) return null;

  return (
    <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${ended ? "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" : "border-civic/20 bg-civic/10 text-civic dark:border-emerald-200/25 dark:bg-emerald-200/10 dark:text-emerald-100"}`}>
      <Clock className="h-3.5 w-3.5" />
      {ended ? (
        <span>{t("poll.endedMessage")}</span>
      ) : (
        <span>
          {endDate.getTime() - now >= 86400000 ? t("poll.endsIn") : t("poll.remaining")} {formatRemaining(endDate.getTime() - now, language)}
        </span>
      )}
    </div>
  );
}
