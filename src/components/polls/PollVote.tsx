"use client";

import { useState } from "react";
import { Vote } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

type Poll = {
  _id: string;
  question: string;
  description?: string | null;
  options: Array<{ _id: string; text: string; votesCount: number }>;
  totalVotes: number;
};

export default function PollVote({ poll }: { poll: Poll }) {
  const [current, setCurrent] = useState(poll);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  async function submit() {
    setError("");
    const response = await fetch(`/api/polls/${current._id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: selected })
    });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!json.ok) {
      setError(json.error?.message || "تعذر التصويت");
      return;
    }
    setCurrent(json.data.poll);
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold">{current.question}</h3>
      {current.description ? <p className="text-sm text-ink/70">{current.description}</p> : null}
      <div className="space-y-2">
        {current.options.map((option) => {
          const percentage = current.totalVotes > 0 ? Math.round((option.votesCount / current.totalVotes) * 100) : 0;
          return (
            <label key={option._id} className="block rounded border border-line p-3">
              <input type="radio" name={`poll-${current._id}`} value={option._id} checked={selected === option._id} onChange={() => setSelected(option._id)} className="ml-2" />
              <span>{option.text}</span>
              <div className="mt-2 h-2 rounded bg-line">
                <div className="h-2 rounded bg-civic" style={{ width: `${percentage}%` }} />
              </div>
              <span className="text-xs text-ink/60">{option.votesCount} صوت، {percentage}%</span>
            </label>
          );
        })}
      </div>
      <button onClick={submit} disabled={!selected} className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="button">
        <Vote className="ml-2 inline h-4 w-4" />
        تصويت
      </button>
      <p className="text-xs text-ink/60">نتائج التصويتات تعبر عن مستخدمي المنصة وليست استطلاعًا علميًا.</p>
      {error ? <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
