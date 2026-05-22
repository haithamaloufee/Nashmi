import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import SurveyDateMeta from "@/components/surveys/SurveyDateMeta";
import SurveyStatusBadge from "@/components/surveys/SurveyStatusBadge";
import SafeImage from "@/components/ui/SafeImage";
import { getSurveyHref } from "@/lib/surveys";

type Survey = {
  _id: string;
  slug?: string;
  title: string;
  description?: string | null;
  lifecycleStatus?: string;
  status?: string;
  totalResponses?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  publisherSnapshot?: { name?: string | null; imageUrl?: string | null; badge?: string | null; href?: string | null } | null;
};

export default function SurveyCard({ survey, compact = false }: { survey: Survey; compact?: boolean }) {
  const publisher = survey.publisherSnapshot;
  const href = getSurveyHref(survey);
  return (
    <article className="card card-hover bg-white p-5 dark:bg-slate-950">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SafeImage
            src={publisher?.imageUrl || null}
            alt={publisher?.name || "استبيان"}
            className="h-11 w-11 shrink-0 rounded bg-white object-contain ring-1 ring-line dark:bg-slate-900"
            fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded bg-civic/10 text-lg font-black text-civic">{(publisher?.name || "N").slice(0, 1)}</div>}
            localPrefixes={["/uploads/", "/images/", "/related/"]}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2.5 py-1 text-xs font-black text-clay dark:bg-amber-200/10 dark:text-amber-100">
                <ClipboardList className="h-3.5 w-3.5" />
                استبيان
              </span>
              <SurveyStatusBadge status={survey.lifecycleStatus || survey.status} />
            </div>
            {publisher?.name ? <p className="mt-1 text-sm font-semibold text-ink/65 dark:text-slate-300">{publisher.name}</p> : null}
          </div>
        </div>
      </div>
      <h3 className="text-lg font-black leading-8 text-slate-950 dark:text-white">{survey.title}</h3>
      {survey.description ? <p className={`mt-2 leading-7 text-ink/70 dark:text-slate-300 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{survey.description}</p> : null}
      <div className="mt-4">
        <SurveyDateMeta startsAt={survey.startsAt} endsAt={survey.endsAt} totalResponses={survey.totalResponses} />
      </div>
      {href ? (
        <Link href={href} className="mt-4 inline-flex items-center gap-2 rounded bg-civic px-4 py-2 text-sm font-bold text-white hover:bg-civic/90">
          عرض الاستبيان
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded bg-slate-300 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          عرض الاستبيان
          <ArrowLeft className="h-4 w-4" />
        </span>
      )}
    </article>
  );
}
