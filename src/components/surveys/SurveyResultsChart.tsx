type BarItem = {
  id?: string;
  label: string;
  count: number;
  percentage: number;
};

export default function SurveyResultsChart({ items }: { items: BarItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id || item.label} className="rounded border border-line bg-white p-3 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 break-words font-bold">{item.label}</span>
            <span className="shrink-0 font-black text-civic">{item.percentage}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div className="h-full rounded-full bg-civic transition-all duration-300 dark:bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink/55 dark:text-slate-400">{item.count.toLocaleString("ar-JO")} إجابة</p>
        </div>
      ))}
    </div>
  );
}
