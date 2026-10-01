"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, Users } from "lucide-react";
import { useEffect, useState } from "react";
import SafeImage from "@/components/ui/SafeImage";
import SurveyStatusBadge from "@/components/surveys/SurveyStatusBadge";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber, formatRelativeTime } from "@/lib/localization";
import { getSurveyHref } from "@/lib/surveys";

type SurveyFeedItem = {
  _id: string;
  slug?: string;
  title: string;
  description?: string | null;
  lifecycleStatus?: string | null;
  status?: string | null;
  totalResponses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  publisherSnapshot?: {
    name?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    badge?: string | null;
  } | null;
};

export default function SurveyFeedCard({ survey }: { survey: SurveyFeedItem }) {
  const { language, t } = useTranslation();
  const [timeReady, setTimeReady] = useState(false);
  const publisher = survey.publisherSnapshot;
  const href = getSurveyHref(survey);
  const isOpen = survey.lifecycleStatus ? survey.lifecycleStatus === "open" : survey.status === "published";
  const publishedAt = survey.publishedAt || survey.createdAt;

  useEffect(() => {
    setTimeReady(true);
  }, []);

  const avatar = (
    <SafeImage
      src={publisher?.imageUrl || null}
      alt={publisher?.name || t("content.survey")}
      sizes="44px"
      className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-1 ring-line dark:bg-slate-900"
      fallback={<div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay/10 text-lg font-bold text-clay ring-1 ring-line dark:bg-amber-200/10 dark:text-amber-100">{(publisher?.name || t("content.survey")).slice(0, 1)}</div>}
      localPrefixes={["/uploads/", "/images/", "/related/"]}
    />
  );

  return (
    <article className="card feed-card overflow-visible bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {publisher?.href ? (
            <Link href={publisher.href} className="focus-ring shrink-0 rounded-full">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {publisher?.href ? (
                <Link href={publisher.href} className="font-bold hover:text-civic hover:underline dark:hover:text-emerald-200">
                  {publisher.name || t("content.survey")}
                </Link>
              ) : (
                <h3 className="font-bold">{publisher?.name || t("content.survey")}</h3>
              )}
              {publisher?.badge ? <span className="sr-only">{publisher.badge}</span> : null}
              <span className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2.5 py-1 text-xs font-black text-clay dark:bg-amber-200/10 dark:text-amber-100">
                <ClipboardList className="h-3.5 w-3.5" />
                {t("survey.badge")}
              </span>
              <SurveyStatusBadge status={survey.lifecycleStatus || survey.status} />
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400" data-visual-dynamic>
              {timeReady && publishedAt ? formatRelativeTime(publishedAt, language) : ""}
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-base font-bold leading-7 text-slate-950 dark:text-white">{survey.title}</h3>
      {survey.description ? <p className="mt-2 line-clamp-3 whitespace-pre-line break-words leading-7 text-slate-700 dark:text-slate-300">{survey.description}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-slate-200 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {typeof survey.totalResponses === "number" ? <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 text-civic dark:text-emerald-200" />
          {formatNumber(survey.totalResponses, language)} {t("survey.participants")}
        </span> : null}
        {survey.endsAt ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-civic dark:text-emerald-200" />
            {timeReady ? formatRelativeTime(survey.endsAt, language) : ""}
          </span>
        ) : null}
      </div>

      {href ? (
        <Link href={href} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-civic/10 px-4 py-2 text-sm font-bold text-civic hover:bg-civic/20">
          {isOpen ? t("survey.participate") : t("survey.view")}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : null}
    </article>
  );
}
