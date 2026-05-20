import { CalendarDays, Users } from "lucide-react";

function formatDate(value?: string | Date | null) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-JO", { year: "numeric", month: "short", day: "numeric" });
}

export default function SurveyDateMeta({ startsAt, endsAt, totalResponses = 0 }: { startsAt?: string | Date | null; endsAt?: string | Date | null; totalResponses?: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-ink/65 dark:text-slate-300">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4 text-civic" />
        {formatDate(startsAt)} - {formatDate(endsAt)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="h-4 w-4 text-civic" />
        {Number(totalResponses || 0).toLocaleString("ar-JO")} مشارك
      </span>
    </div>
  );
}
