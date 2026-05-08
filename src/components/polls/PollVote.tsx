"use client";

import { useState } from "react";
import { Vote } from "lucide-react";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useToast } from "@/components/ui/ToastProvider";

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
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { showToast } = useToast();

  async function submit() {
    if (!selected || loading || voted) return;
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
        showToast(json.error?.message || "تعذر التصويت", "error");
        return;
      }
      setCurrent(json.data.poll);
      showToast("تم تسجيل التصويت", "success");
    } catch {
      setLoading(false);
      setCurrent(previous);
      setVoted(false);
      showToast("تعذر الاتصال بالخادم", "error");
    }
  }

  return (
    <div className="space-y-3">
      {current.description ? <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{current.description}</p> : null}
      <div className="space-y-2">
        {current.options.map((option) => {
          const percentage = current.totalVotes > 0 ? Math.round((option.votesCount / current.totalVotes) * 100) : 0;
          return (
            <label key={option._id} className="block rounded border border-slate-200 bg-white p-3 text-slate-900 transition hover:border-civic/45 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:border-emerald-300/60">
              <div className="flex items-center gap-2">
                <input type="radio" name={`poll-${current._id}`} value={option._id} checked={selected === option._id} onChange={() => setSelected(option._id)} disabled={voted || loading} className="ml-1 text-civic focus:ring-civic" />
                <span className="font-semibold">{option.text}</span>
              </div>
              {current.totalVotes > 0 ? (
                <>
                  <div className="mt-2 h-2 rounded bg-slate-200 dark:bg-slate-800">
                    <div className="h-2 rounded bg-civic transition-all duration-300" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{option.votesCount} صوت، {percentage}%</span>
                </>
              ) : (
                <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">لا توجد أصوات بعد</span>
              )}
            </label>
          );
        })}
      </div>
      <button onClick={submit} disabled={!selected || loading || voted} className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic active:scale-[0.98] disabled:opacity-50 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]" type="button">
        <Vote className="ml-2 inline h-4 w-4" />
        {voted ? "تم التصويت" : loading ? "جار التصويت..." : "تصويت"}
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">نتائج التصويتات تعبر عن مستخدمي المنصة وليست استطلاعًا علميًا.</p>
      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
