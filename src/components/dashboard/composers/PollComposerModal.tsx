"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ListPlus, Plus, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ComposerModalShell from "@/components/dashboard/composers/ComposerModalShell";
import PublisherIdentity from "@/components/dashboard/composers/PublisherIdentity";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import LoadingButton from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import type { TranslationKey } from "@/lib/i18n";
import { allowedPollDurationDays, defaultPollDurationDays } from "@/lib/polls";

type PollComposerModalProps = {
  open: boolean;
  publisher: PublisherComposerProfile;
  onClose: () => void;
};

type PollErrorKey = Extract<
  TranslationKey,
  | "composer.vote.validation.questionRequired"
  | "composer.vote.validation.questionTooShort"
  | "composer.vote.validation.twoOptionsRequired"
  | "composer.vote.validation.duplicateOptions"
>;

function trimmedOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

export default function PollComposerModal({ open, publisher, onClose }: PollComposerModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [resultsVisibility, setResultsVisibility] = useState("always");
  const [durationDays, setDurationDays] = useState(defaultPollDurationDays);
  const [errors, setErrors] = useState<PollErrorKey[]>([]);
  const [loading, setLoading] = useState(false);

  const nonEmptyOptions = useMemo(() => trimmedOptions(options), [options]);
  const hasDuplicateOptions = useMemo(() => new Set(nonEmptyOptions).size !== nonEmptyOptions.length, [nonEmptyOptions]);
  const dirty = Boolean(question.trim() || description.trim() || options.some((option) => option.trim()) || resultsVisibility !== "always" || durationDays !== defaultPollDurationDays);
  const canSubmit = question.trim().length >= 5 && nonEmptyOptions.length >= 2 && !hasDuplicateOptions && !loading;

  function getErrors() {
    const nextErrors: PollErrorKey[] = [];
    if (!question.trim()) nextErrors.push("composer.vote.validation.questionRequired");
    else if (question.trim().length < 5) nextErrors.push("composer.vote.validation.questionTooShort");
    if (nonEmptyOptions.length < 2) nextErrors.push("composer.vote.validation.twoOptionsRequired");
    if (hasDuplicateOptions) nextErrors.push("composer.vote.validation.duplicateOptions");
    return nextErrors;
  }

  function reset() {
    setQuestion("");
    setDescription("");
    setOptions(["", ""]);
    setResultsVisibility("always");
    setDurationDays(defaultPollDurationDays);
    setErrors([]);
    setLoading(false);
  }

  function optionPlaceholder(index: number) {
    if (index === 0) return t("composer.vote.optionOne");
    if (index === 1) return t("composer.vote.optionTwo");
    return `${t("composer.vote.optionPlaceholder")} ${index + 1}`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = getErrors();
    setErrors(nextErrors);
    if (nextErrors.length) return;

    setLoading(true);
    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          description: description.trim() || null,
          options: nonEmptyOptions,
          resultsVisibility,
          durationDays
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        showToast(t("composer.vote.error"), "error");
        return;
      }

      reset();
      showToast(t("composer.vote.success"), "success");
      router.refresh();
      onClose();
    } catch {
      showToast(t("composer.vote.error"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ComposerModalShell
      open={open}
      titleKey="composer.vote.title"
      dirty={dirty && !loading}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="space-y-5 p-4 sm:p-5">
          <PublisherIdentity publisher={publisher} />

          <label className="grid gap-2 text-sm font-black">
            {t("composer.vote.questionLabel")}
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              placeholder={t("composer.vote.questionPlaceholder")}
              aria-invalid={errors.includes("composer.vote.validation.questionRequired") || errors.includes("composer.vote.validation.questionTooShort")}
              className="w-full resize-y rounded-2xl bg-white/85 px-4 py-3 text-base leading-8 dark:bg-slate-900"
            />
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder={t("composer.vote.descriptionPlaceholder")}
            className="w-full resize-y rounded-xl bg-white/85 px-4 py-3 text-sm leading-7 dark:bg-slate-900"
          />

          <div className="rounded-2xl border border-line bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black">
                <ListPlus className="h-4 w-4 text-civic dark:text-emerald-200" />
                {t("composer.vote.optionsLabel")}
              </div>
              <button
                type="button"
                onClick={() => setOptions((current) => (current.length >= 6 ? current : [...current, ""]))}
                disabled={options.length >= 6}
                className="inline-flex items-center gap-1 rounded border border-line bg-white px-3 py-1.5 text-sm font-bold hover:border-civic disabled:opacity-50 dark:bg-slate-950"
              >
                <Plus className="h-4 w-4" />
                {t("composer.vote.addOption")}
              </button>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={option}
                    onChange={(event) => setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                    placeholder={optionPlaceholder(index)}
                    className="min-w-0 flex-1 rounded-xl bg-white dark:bg-slate-950"
                  />
                  {index > 1 ? (
                    <button
                      type="button"
                      onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={t("composer.vote.removeOption")}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-red-700 hover:border-red-300 hover:bg-red-50 dark:bg-slate-950 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {errors.length ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {errors.map((item) => (
                <p key={item}>{t(item)}</p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">
              {t("poll.create.resultsVisibility")}
              <select value={resultsVisibility} onChange={(event) => setResultsVisibility(event.target.value)} className="rounded-xl bg-white dark:bg-slate-900">
                <option value="always">{t("poll.create.results.always")}</option>
                <option value="after_vote">{t("poll.create.results.afterVote")}</option>
                <option value="after_close">{t("poll.create.results.afterClose")}</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              {t("poll.duration")}
              <select value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} className="rounded-xl bg-white dark:bg-slate-900">
                {allowedPollDurationDays.map((days) => (
                  <option key={days} value={days}>
                    {t(`poll.duration.${days}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <footer className="sticky bottom-0 border-t border-line bg-[#fffaf1]/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:px-5">
          <LoadingButton type="submit" loading={loading} disabled={!canSubmit} className="w-full rounded-xl bg-civic px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-civic/90">
            {loading ? t("composer.vote.loading") : (
              <>
                <Send className="h-4 w-4" />
                {t("composer.vote.submit")}
              </>
            )}
          </LoadingButton>
        </footer>
      </form>
    </ComposerModalShell>
  );
}
