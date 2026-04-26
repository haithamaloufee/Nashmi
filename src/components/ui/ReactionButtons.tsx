"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

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
  const [message, setMessage] = useState("");

  async function send(next: "like" | "dislike" | null) {
    const previous = reaction;
    setMessage("");
    const response = await fetch(`/api/${targetType}/${targetId}/reaction`, {
      method: next ? "PUT" : "DELETE",
      headers: next ? { "Content-Type": "application/json" } : undefined,
      body: next ? JSON.stringify({ type: next }) : undefined
    });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!json.ok) {
      setMessage(json.error?.message || "تعذر تحديث التفاعل");
      return;
    }

    setCounts((current) => {
      const updated = { ...current };
      if (previous) updated[previous] = Math.max(0, updated[previous] - 1);
      if (next) updated[next] += 1;
      return updated;
    });
    setReaction(next);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <button
        onClick={() => send(reaction === "like" ? null : "like")}
        type="button"
        className={`rounded border px-3 py-1.5 ${reaction === "like" ? "border-civic bg-civic/10 text-civic" : "border-line text-ink/70"}`}
      >
        <ThumbsUp className="ml-1 inline h-4 w-4" />
        {counts.like}
      </button>
      <button
        onClick={() => send(reaction === "dislike" ? null : "dislike")}
        type="button"
        className={`rounded border px-3 py-1.5 ${reaction === "dislike" ? "border-clay bg-clay/10 text-clay" : "border-line text-ink/70"}`}
      >
        <ThumbsDown className="ml-1 inline h-4 w-4" />
        {counts.dislike}
      </button>
      {reaction ? (
        <button onClick={() => send(null)} type="button" className="rounded border border-line px-2 py-1.5 text-ink/60" aria-label="إزالة التفاعل">
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {message ? <span className="text-xs text-red-700">{message}</span> : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
