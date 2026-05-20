"use client";

import { youtubeEmbedUrl } from "@/lib/youtube";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { getLocalizedValue } from "@/lib/localization";

type AboutContent = {
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr?: string | null;
  bodyEn?: string | null;
  youtubeVideoId?: string | null;
};

export default function AboutNashmiPageClient({ content }: { content: AboutContent }) {
  const { language, t } = useTranslation();
  const title = getLocalizedValue(content, "title", language) || t("about.defaultTitle");
  const body = getLocalizedValue(content, "body", language) || t("about.defaultBody");
  const embedUrl = content.youtubeVideoId ? youtubeEmbedUrl(content.youtubeVideoId) : null;

  return (
    <main className="container-page py-10">
      <section className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black text-civic dark:text-emerald-200">{t("about.nav")}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{title}</h1>
        <p className="mt-5 whitespace-pre-line text-lg leading-9 text-ink/72 dark:text-slate-300">{body}</p>
      </section>

      <section className="mx-auto mt-10 max-w-6xl" aria-label={t("about.videoTitle")}>
        <div className="overflow-hidden rounded-[22px] border-[14px] border-black bg-black shadow-soft">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={t("about.videoTitle")}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="grid aspect-video place-items-center bg-slate-100 p-8 text-center text-lg font-bold text-ink/65 dark:bg-slate-900 dark:text-slate-300">
              {t("about.videoPending")}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
