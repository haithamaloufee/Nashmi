"use client";

import { ExternalLink, Newspaper } from "lucide-react";
import { NEWS_CATEGORY_LABELS, type NewsCategory, type NewsSource, type NewsUrgency } from "@/lib/news/types";

export type ClientNewsContext = {
  newsId: string;
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  urgency: NewsUrgency;
  publishedAt: string;
  legislativeStage?: string | null;
  sources: NewsSource[];
};

export default function NewsContextCard({ news }: { news: ClientNewsContext }) {
  return (
    <article className="mx-4 mt-4 overflow-hidden rounded-2xl border border-civic/20 bg-gradient-to-br from-emerald-50 to-white shadow-sm dark:border-emerald-200/20 dark:from-[#102b30] dark:to-slate-950">
      <div className="flex items-start gap-3 p-4">
        <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-civic text-white"><Newspaper className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-civic dark:text-emerald-200">
            <span>{NEWS_CATEGORY_LABELS[news.category]}</span>
            {news.urgency === "breaking" ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-white">عاجل</span> : null}
            <time dateTime={news.publishedAt}>{new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Amman" }).format(new Date(news.publishedAt))}</time>
          </div>
          <h2 className="mt-2 text-lg font-black leading-8 text-slate-950 dark:text-white">{news.titleAr}</h2>
          <p className="mt-1 text-sm leading-7 text-slate-700 dark:text-slate-200">{news.summaryAr}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {news.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-civic/20 bg-white px-2.5 py-1 text-xs font-bold text-civic hover:border-civic dark:bg-slate-900 dark:text-emerald-200">
                {source.publisher}<ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
