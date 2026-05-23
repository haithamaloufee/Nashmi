"use client";

import { useState } from "react";
import { BarChart3, FileText, ListChecks, PlusCircle } from "lucide-react";
import ComposerModalShell from "@/components/dashboard/composers/ComposerModalShell";
import PollComposerModal from "@/components/dashboard/composers/PollComposerModal";
import PostComposerModal from "@/components/dashboard/composers/PostComposerModal";
import PublisherIdentity from "@/components/dashboard/composers/PublisherIdentity";
import SurveyComposerModal from "@/components/dashboard/composers/SurveyComposerModal";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type ComposerKind = "post" | "survey" | "poll";

type ChooserItem = {
  kind: ComposerKind;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof FileText;
};

const chooserItems: ChooserItem[] = [
  {
    kind: "post",
    titleKey: "updates.create.post",
    descriptionKey: "dashboard.createContent.post.description",
    icon: FileText
  },
  {
    kind: "survey",
    titleKey: "updates.create.survey",
    descriptionKey: "dashboard.createContent.survey.description",
    icon: BarChart3
  },
  {
    kind: "poll",
    titleKey: "updates.create.poll",
    descriptionKey: "dashboard.createContent.poll.description",
    icon: ListChecks
  }
];

export default function UpdatesPublishButton({ publisher, onPublished }: { publisher: PublisherComposerProfile; onPublished?: () => void }) {
  const { t } = useTranslation();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<ComposerKind | null>(null);

  function closeAll() {
    setComposerKind(null);
    setChooserOpen(false);
  }

  function backToChooser() {
    setComposerKind(null);
    setChooserOpen(true);
  }

  function openComposer(kind: ComposerKind) {
    setChooserOpen(false);
    setComposerKind(kind);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setComposerKind(null);
          setChooserOpen(true);
        }}
        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-civic px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-civic/90 active:scale-[0.98] dark:bg-emerald-200 dark:text-slate-950 dark:hover:bg-emerald-100"
      >
        <PlusCircle className="h-4 w-4" />
        {t("updates.publishNew")}
      </button>

      <ComposerModalShell open={chooserOpen && !composerKind} titleKey="updates.create.chooseType" dirty={false} onClose={() => setChooserOpen(false)}>
        <div className="space-y-5 p-4 sm:p-5">
          <PublisherIdentity publisher={publisher} />
          <div className="grid gap-3 sm:grid-cols-3">
            {chooserItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => openComposer(item.kind)}
                  className="group min-h-44 rounded-2xl border border-line bg-white/75 p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-civic hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-emerald-200"
                >
                  <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-civic/10 text-civic transition group-hover:bg-civic group-hover:text-white dark:bg-emerald-200/10 dark:text-emerald-100 dark:group-hover:bg-emerald-200 dark:group-hover:text-slate-950">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="block text-base font-black">{t(item.titleKey)}</span>
                  <span className="mt-2 block text-sm leading-6 text-ink/65 dark:text-slate-300">{t(item.descriptionKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </ComposerModalShell>

      <PostComposerModal open={composerKind === "post"} publisher={publisher} onBack={backToChooser} onClose={closeAll} onPublished={onPublished} />
      <SurveyComposerModal open={composerKind === "survey"} publisher={publisher} onBack={backToChooser} onClose={closeAll} onPublished={onPublished} />
      <PollComposerModal open={composerKind === "poll"} publisher={publisher} onBack={backToChooser} onClose={closeAll} onPublished={onPublished} />
    </>
  );
}
