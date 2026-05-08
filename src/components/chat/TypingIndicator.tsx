"use client";

export default function TypingIndicator({ label = "نشمي الذكي يكتب..." }: { label?: string }) {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-civic shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-200">
      <span>{label}</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
      </span>
    </div>
  );
}
