"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  targetType: "posts" | "polls";
  targetId: string;
  likesCount: number;
  dislikesCount: number;
};

export default function ReactionButtons({ targetType, targetId, likesCount, dislikesCount }: Props) {
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
        showToast(json.error?.message || "تعذر تحديث التفاعل", "error");
        return;
      }
      if (typeof json.data?.likesCount === "number" && typeof json.data?.dislikesCount === "number") {
        setCounts({ like: json.data.likesCount, dislike: json.data.dislikesCount });
      }
    } catch {
      setPending(false);
      setReaction(previous);
      setCounts(previousCounts);
      showToast("تعذر الاتصال بالخادم", "error");
    }
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
      <button
        onClick={() => send(reaction === "like" ? null : "like")}
        type="button"
        disabled={pending}
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 font-semibold transition hover:bg-civic/10 active:scale-95 disabled:opacity-60 ${
          reaction === "like" ? "bg-civic/10 text-civic ring-1 ring-civic/20" : "text-ink/70"
        }`}
      >
        <ThumbsUp className="h-4 w-4" />
        {counts.like}
      </button>
      <button
        onClick={() => send(reaction === "dislike" ? null : "dislike")}
        type="button"
        disabled={pending}
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 font-semibold transition hover:bg-clay/10 active:scale-95 disabled:opacity-60 ${
          reaction === "dislike" ? "bg-clay/10 text-clay ring-1 ring-clay/20" : "text-ink/70"
        }`}
      >
        <ThumbsDown className="h-4 w-4" />
        {counts.dislike}
      </button>
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
