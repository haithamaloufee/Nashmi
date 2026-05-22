"use client";

import { useMemo, useState } from "react";
import { BarChart3, FileText, ListChecks, PlusCircle } from "lucide-react";
import PollComposerModal from "@/components/dashboard/composers/PollComposerModal";
import PostComposerModal from "@/components/dashboard/composers/PostComposerModal";
import SurveyComposerModal from "@/components/dashboard/composers/SurveyComposerModal";
import type { PublisherAccountType, PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type ComposerKind = "post" | "poll" | "survey";

type CreateItem = {
  kind: ComposerKind;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  ctaKey: TranslationKey;
  icon: typeof FileText;
};

type PublisherCreateHubProps = {
  basePath: "/party-dashboard" | "/iec-dashboard";
  includePolls?: boolean;
  publisher: Omit<PublisherComposerProfile, "accountType"> & { accountType?: PublisherAccountType };
};

export default function PublisherCreateHub({ basePath, includePolls = true, publisher }: PublisherCreateHubProps) {
  const { t } = useTranslation();
  const [openComposer, setOpenComposer] = useState<ComposerKind | null>(null);
  const accountType = publisher.accountType || (basePath === "/iec-dashboard" ? "authority" : "party");
  const composerPublisher: PublisherComposerProfile = { ...publisher, accountType };
  const items = useMemo<CreateItem[]>(
    () => [
      {
        kind: "post",
        titleKey: "dashboard.createContent.post.title",
        descriptionKey: "dashboard.createContent.post.description",
        ctaKey: "dashboard.createContent.post.button",
        icon: FileText
      },
      ...(includePolls
        ? [{
            kind: "poll" as const,
            titleKey: "dashboard.createContent.poll.title" as const,
            descriptionKey: "dashboard.createContent.poll.description" as const,
            ctaKey: "dashboard.createContent.poll.button" as const,
            icon: ListChecks
          }]
        : []),
      {
        kind: "survey",
        titleKey: "dashboard.createContent.survey.title",
        descriptionKey: "dashboard.createContent.survey.description",
        ctaKey: "dashboard.createContent.survey.button",
        icon: BarChart3
      }
    ],
    [includePolls]
  );

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <PlusCircle className="h-5 w-5 text-civic" />
        <h2 className="text-xl font-black">{t("dashboard.createContent.title")}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => setOpenComposer(item.kind)}
              aria-label={t(item.ctaKey)}
              className="card card-hover group block bg-white p-4 text-start dark:bg-slate-950"
            >
              <div className="mb-3 grid h-10 w-10 place-items-center rounded bg-civic/10 text-civic transition group-hover:bg-civic group-hover:text-white dark:group-hover:bg-emerald-300 dark:group-hover:text-slate-950">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-black">{t(item.titleKey)}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-ink/65 dark:text-slate-300">{t(item.descriptionKey)}</p>
              <span className="mt-4 inline-flex rounded bg-civic px-3 py-2 text-sm font-bold text-white">{t(item.ctaKey)}</span>
            </button>
          );
        })}
      </div>

      <PostComposerModal open={openComposer === "post"} publisher={composerPublisher} onClose={() => setOpenComposer(null)} />
      <PollComposerModal open={openComposer === "poll"} publisher={composerPublisher} onClose={() => setOpenComposer(null)} />
      <SurveyComposerModal open={openComposer === "survey"} publisher={composerPublisher} onClose={() => setOpenComposer(null)} />
    </section>
  );
}
