import { MessageSquareText } from "lucide-react";

export default function SurveyEmptyState({ title = "لا توجد استجابات بعد", body = "كن أول من يشارك في هذا الاستبيان." }: { title?: string; body?: string }) {
  return (
    <div className="rounded border border-dashed border-civic/35 bg-civic/5 p-6 text-center dark:bg-emerald-200/8">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-civic shadow-sm dark:bg-slate-900">
        <MessageSquareText className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-lg font-black">{title}</h3>
      <p className="mt-1 text-sm text-ink/65 dark:text-slate-300">{body}</p>
    </div>
  );
}
