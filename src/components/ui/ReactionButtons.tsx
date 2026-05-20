"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";

type Props = {
  targetType: "posts" | "polls";
  targetId: string;
  likesCount: number;
  dislikesCount: number;
};

export default function ReactionButtons({ targetType, targetId, likesCount, dislikesCount }: Props) {
  const { language, t } = useTranslation();
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [counts, setCounts] = useState({ like: likesCount, dislike: dislikesCount });
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();

  function calculateCounts(current: typeof counts, previous: typeof reaction, next: typeof reaction) {
    const updated = { ...current };
    if (previous) updated[previous] = Math.max(0, updated[previous] - 1);
    if (next) updated[next] += 1;
    return updated;
  }

  async function send(next: "like" | "dislike" | null) {
    const previous = reaction;
    const previousCounts = counts;
    const nextCounts = calculateCounts(counts, previous, next);
    setReaction(next);
    setCounts(nextCounts);
    setPending(true);

    try {
      const response = await fetch(`/api/${targetType}/${targetId}/reaction`, {
        method: next ? "PUT" : "DELETE",
        headers: next ? { "Content-Type": "application/json" } : undefined,
        body: next ? JSON.stringify({ type: next }) : undefined
      });
      const json = await response.json().catch(() => ({}));
      setPending(false);
      if (response.status === 401) {
        setReaction(previous);
        setCounts(previousCounts);
        setLoginOpen(true);
        return;
      }
      if (!json.ok) {
        setReaction(previous);
        setCounts(previousCounts);
        showToast(json.error?.message || t("common.error"), "error");
        return;
      }
      if (typeof json.data?.likesCount === "number" && typeof json.data?.dislikesCount === "number") {
        setCounts({ like: json.data.likesCount, dislike: json.data.dislikesCount });
      }
    } catch {
      setPending(false);
      setReaction(previous);
      setCounts(previousCounts);
      showToast(t("poll.connectionFailed"), "error");
    }
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
      <button
        onClick={() => send(reaction === "like" ? null : "like")}
        type="button"
        disabled={pending}
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 font-semibold transition hover:bg-civic/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic active:scale-95 disabled:opacity-60 dark:hover:bg-emerald-200/10 ${
          reaction === "like" ? "bg-civic/10 text-civic ring-1 ring-civic/20 dark:bg-emerald-200/12 dark:text-emerald-100 dark:ring-emerald-200/25" : "text-slate-600 dark:text-slate-300"
        }`}
        aria-label={t("reaction.like")}
      >
        <ThumbsUp className="h-4 w-4" />
        {formatNumber(counts.like, language)}
      </button>
      <button
        onClick={() => send(reaction === "dislike" ? null : "dislike")}
        type="button"
        disabled={pending}
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 font-semibold transition hover:bg-clay/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay active:scale-95 disabled:opacity-60 dark:hover:bg-amber-300/10 ${
          reaction === "dislike" ? "bg-clay/10 text-clay ring-1 ring-clay/20 dark:bg-amber-300/12 dark:text-amber-200 dark:ring-amber-200/20" : "text-slate-600 dark:text-slate-300"
        }`}
        aria-label={t("reaction.dislike")}
      >
        <ThumbsDown className="h-4 w-4" />
        {formatNumber(counts.dislike, language)}
      </button>
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
