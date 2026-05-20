"use client";

import { useEffect, useState } from "react";
import { Vote } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";
import { isPollEnded } from "@/lib/polls";

type Poll = {
  _id: string;
  question: string;
  description?: string | null;
  options: Array<{ _id: string; text: string; votesCount: number }>;
  totalVotes: number;
  status?: string | null;
  durationDays?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
};

export default function PollVote({ poll }: { poll: Poll }) {
  const { language, t } = useTranslation();
  const [current, setCurrent] = useState(poll);
  const [selected, setSelected] = useState("");
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { showToast } = useToast();
  const ended = isPollEnded(current);

  useEffect(() => {
    setCurrent(poll);
    setSelected("");
    setVoted(false);
  }, [poll]);

  async function submit() {
    if (!selected || loading || voted || ended) return;
    const previous = current;
    const optimistic = {
      ...current,
      totalVotes: current.totalVotes + 1,
      options: current.options.map((option) => (option._id === selected ? { ...option, votesCount: option.votesCount + 1 } : option))
    };
    setCurrent(optimistic);
    setVoted(true);
    setLoading(true);
    try {
      const response = await fetch(`/api/polls/${current._id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: selected })
      });
      const json = await response.json().catch(() => ({}));
      setLoading(false);
      if (response.status === 401) {
        setCurrent(previous);
        setVoted(false);
        setLoginOpen(true);
        return;
      }
      if (!json.ok) {
        setCurrent(previous);
        setVoted(false);
        showToast(json.error?.message || t("poll.voteFailed"), "error");
        return;
      }
      setCurrent(json.data.poll);
      showToast(t("poll.voteSaved"), "success");
    } catch {
      setLoading(false);
      setCurrent(previous);
      setVoted(false);
      showToast(t("poll.connectionFailed"), "error");
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="space-y-2">
        {current.options.map((option) => {
          const percentage = current.totalVotes > 0 ? Math.round((option.votesCount / current.totalVotes) * 100) : 0;
          return (
            <label key={option._id} className="block rounded border border-slate-200 bg-white p-3 text-slate-900 transition hover:border-civic/45 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:border-emerald-300/60">
              <div className="flex items-start gap-2">
                <input type="radio" name={`poll-${current._id}`} value={option._id} checked={selected === option._id} onChange={() => setSelected(option._id)} disabled={voted || loading || ended} className="mt-1 text-civic focus:ring-civic" />
                <span className="min-w-0 flex-1 break-words font-semibold">{option.text}</span>
                <span className="shrink-0 text-xs font-bold text-civic">{formatNumber(percentage, language)}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-800" aria-hidden="true">
                <div className="h-full rounded bg-civic transition-all duration-300 dark:bg-emerald-400" style={{ width: `${percentage}%` }} />
              </div>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {current.totalVotes > 0 ? `${formatNumber(option.votesCount, language)} ${t("poll.voteCount")}` : t("poll.noVotes")}
              </span>
            </label>
          );
        })}
      </div>
      <button onClick={submit} disabled={!selected || loading || voted || ended} className="inline-flex items-center justify-center gap-2 rounded bg-civic px-4 py-2 text-sm font-semibold text-white hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic active:scale-[0.98] disabled:opacity-50 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]" type="button">
        <Vote className="h-4 w-4" />
        {ended ? t("poll.endedMessage") : voted ? t("poll.voted") : loading ? t("poll.voting") : t("poll.vote")}
      </button>
      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">{t("poll.disclaimer")}</p>
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
