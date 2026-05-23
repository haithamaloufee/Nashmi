"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BarChart3, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ComposerModalShell from "@/components/dashboard/composers/ComposerModalShell";
import PublisherIdentity from "@/components/dashboard/composers/PublisherIdentity";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import LoadingButton from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import type { TranslationKey } from "@/lib/i18n";

type SurveyComposerModalProps = {
  open: boolean;
  publisher: PublisherComposerProfile;
  onClose: () => void;
  onBack?: () => void;
  onPublished?: () => void;
};

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "YES_NO" | "RATING" | "TEXT";
type SurveyQuestionDraft = {
  key: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options: string[];
};

type SurveyError = {
  key: Extract<
    TranslationKey,
    | "composer.survey.validation.titleRequired"
    | "composer.survey.validation.titleTooShort"
    | "composer.survey.validation.questionRequired"
    | "composer.survey.validation.questionTooShort"
    | "composer.survey.validation.twoOptionsRequired"
    | "composer.survey.validation.duplicateOptions"
  >;
  questionIndex?: number;
};

const choiceTypes: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"];
const questionTypes: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO", "RATING", "TEXT"];

function createQuestion(): SurveyQuestionDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "",
    type: "SINGLE_CHOICE",
    required: true,
    options: ["", ""]
  };
}

function isChoiceQuestion(type: QuestionType) {
  return choiceTypes.includes(type);
}

function cleanOptionLabels(question: SurveyQuestionDraft) {
  return question.options.map((option) => option.trim()).filter(Boolean);
}

export default function SurveyComposerModal({ open, publisher, onClose, onBack, onPublished }: SurveyComposerModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resultsVisibility, setResultsVisibility] = useState("BEFORE_SUBMIT");
  const [questions, setQuestions] = useState<SurveyQuestionDraft[]>([createQuestion()]);
  const [errors, setErrors] = useState<SurveyError[]>([]);
  const [loading, setLoading] = useState(false);

  const dirty = Boolean(
    title.trim() ||
      description.trim() ||
      resultsVisibility !== "BEFORE_SUBMIT" ||
      questions.length > 1 ||
      questions.some((question) => question.title.trim() || question.options.some((option) => option.trim()) || question.type !== "SINGLE_CHOICE" || !question.required)
  );

  const currentErrors = useMemo(() => getValidationErrors(title, questions), [title, questions]);
  const canSubmit = currentErrors.length === 0 && !loading;

  function getValidationErrors(nextTitle: string, nextQuestions: SurveyQuestionDraft[]) {
    const nextErrors: SurveyError[] = [];
    if (!nextTitle.trim()) nextErrors.push({ key: "composer.survey.validation.titleRequired" });
    else if (nextTitle.trim().length < 5) nextErrors.push({ key: "composer.survey.validation.titleTooShort" });
    if (!nextQuestions.length) nextErrors.push({ key: "composer.survey.validation.questionRequired" });

    nextQuestions.forEach((question, questionIndex) => {
      if (!question.title.trim()) nextErrors.push({ key: "composer.survey.validation.questionRequired", questionIndex });
      else if (question.title.trim().length < 3) nextErrors.push({ key: "composer.survey.validation.questionTooShort", questionIndex });
      if (isChoiceQuestion(question.type)) {
        const labels = cleanOptionLabels(question);
        if (labels.length < 2) nextErrors.push({ key: "composer.survey.validation.twoOptionsRequired", questionIndex });
        if (new Set(labels).size !== labels.length) nextErrors.push({ key: "composer.survey.validation.duplicateOptions", questionIndex });
      }
    });

    return nextErrors;
  }

  function reset() {
    setTitle("");
    setDescription("");
    setResultsVisibility("BEFORE_SUBMIT");
    setQuestions([createQuestion()]);
    setErrors([]);
    setLoading(false);
  }

  function updateQuestion(index: number, patch: Partial<SurveyQuestionDraft>) {
    setQuestions((current) =>
      current.map((question, questionIndex) => {
        if (questionIndex !== index) return question;
        const nextType = patch.type || question.type;
        const nextOptions = patch.options || question.options;
        return {
          ...question,
          ...patch,
          options: isChoiceQuestion(nextType) ? (nextOptions.length >= 2 ? nextOptions : ["", ""]) : []
        };
      })
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? { ...question, options: question.options.map((option, itemIndex) => (itemIndex === optionIndex ? value : option)) }
          : question
      )
    );
  }

  function typeLabel(type: QuestionType) {
    return t(`composer.survey.type.${type}` as TranslationKey);
  }

  function errorText(error: SurveyError) {
    if (typeof error.questionIndex === "number") {
      return `${t("composer.survey.questionLabel")} ${error.questionIndex + 1}: ${t(error.key)}`;
    }
    return t(error.key);
  }

  function optionPlaceholder(index: number) {
    return `${t("composer.survey.optionPlaceholder")} ${index + 1}`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = getValidationErrors(title, questions);
    setErrors(nextErrors);
    if (nextErrors.length) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status: "published",
      publisherType: publisher.accountType === "authority" ? "iec" : publisher.accountType,
      resultsVisibility,
      startsAt: null,
      endsAt: null,
      questions: questions.map((question, index) => ({
        title: question.title.trim(),
        description: null,
        type: question.type,
        required: question.required,
        order: index,
        options: isChoiceQuestion(question.type)
          ? cleanOptionLabels(question).map((label, optionIndex) => ({ label, value: null, order: optionIndex }))
          : []
      }))
    };

    setLoading(true);
    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        showToast(t("composer.survey.error"), "error");
        return;
      }

      reset();
      showToast(t("composer.survey.success"), "success");
      onPublished?.();
      router.refresh();
      onClose();
    } catch {
      showToast(t("composer.survey.error"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ComposerModalShell
      open={open}
      titleKey="composer.survey.title"
      dirty={dirty && !loading}
      onBack={onBack ? () => {
        reset();
        onBack();
      } : undefined}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="space-y-5 p-4 sm:p-5">
          <PublisherIdentity publisher={publisher} />

          <div className="grid gap-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("composer.survey.titlePlaceholder")}
              aria-invalid={errors.some((error) => error.key === "composer.survey.validation.titleRequired" || error.key === "composer.survey.validation.titleTooShort")}
              className="w-full rounded-xl bg-white/85 px-4 py-3 font-bold dark:bg-slate-900"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder={t("composer.survey.descriptionPlaceholder")}
              className="w-full resize-y rounded-xl bg-white/85 px-4 py-3 text-sm leading-7 dark:bg-slate-900"
            />
          </div>

          <label className="grid gap-1 text-sm font-bold">
            {t("composer.survey.resultsVisibility")}
            <select value={resultsVisibility} onChange={(event) => setResultsVisibility(event.target.value)} className="rounded-xl bg-white dark:bg-slate-900">
              <option value="BEFORE_SUBMIT">{t("composer.survey.results.beforeSubmit")}</option>
              <option value="AFTER_SUBMIT">{t("composer.survey.results.afterSubmit")}</option>
              <option value="PUBLISHER_ONLY">{t("composer.survey.results.publisherOnly")}</option>
            </select>
          </label>

          <div className="rounded-2xl border border-line bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black">
                <BarChart3 className="h-4 w-4 text-civic dark:text-emerald-200" />
                {t("composer.survey.questionsLabel")}
              </div>
              <button
                type="button"
                onClick={() => setQuestions((current) => [...current, createQuestion()])}
                className="inline-flex items-center gap-1 rounded border border-line bg-white px-3 py-1.5 text-sm font-bold hover:border-civic dark:bg-slate-950"
              >
                <Plus className="h-4 w-4" />
                {t("composer.survey.addQuestion")}
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((question, questionIndex) => (
                <div key={question.key} className="rounded-xl border border-line bg-paper/60 p-3 dark:bg-slate-950">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-civic dark:text-emerald-200">
                      {t("composer.survey.questionLabel")} {questionIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}
                      disabled={questions.length <= 1}
                      aria-label={t("composer.survey.removeQuestion")}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-45 dark:bg-slate-900 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    value={question.title}
                    onChange={(event) => updateQuestion(questionIndex, { title: event.target.value })}
                    placeholder={t("composer.survey.questionPlaceholder")}
                    className="mb-2 w-full rounded-xl bg-white dark:bg-slate-900"
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-bold">
                      {t("composer.survey.typeLabel")}
                      <select
                        value={question.type}
                        onChange={(event) => updateQuestion(questionIndex, { type: event.target.value as QuestionType })}
                        className="rounded-xl bg-white dark:bg-slate-900"
                      >
                        {questionTypes.map((type) => (
                          <option key={type} value={type}>
                            {typeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold dark:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) => updateQuestion(questionIndex, { required: event.target.checked })}
                        className="rounded text-civic focus:ring-civic"
                      />
                      {question.required ? t("composer.survey.requiredLabel") : t("composer.survey.optionalLabel")}
                    </label>
                  </div>

                  {isChoiceQuestion(question.type) ? (
                    <div className="mt-3 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <input
                            value={option}
                            onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                            placeholder={optionPlaceholder(optionIndex)}
                            className="min-w-0 flex-1 rounded-xl bg-white dark:bg-slate-900"
                          />
                          {optionIndex > 1 ? (
                            <button
                              type="button"
                              onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })}
                              aria-label={t("composer.survey.removeOption")}
                              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-red-700 hover:border-red-300 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateQuestion(questionIndex, { options: [...question.options, ""] })}
                        className="inline-flex items-center gap-1 rounded border border-line bg-white px-3 py-1.5 text-sm font-bold hover:border-civic dark:bg-slate-900"
                      >
                        <Plus className="h-4 w-4" />
                        {t("composer.survey.addOption")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {errors.length ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {errors.map((error, index) => (
                <p key={`${error.key}-${error.questionIndex ?? "title"}-${index}`}>{errorText(error)}</p>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 border-t border-line bg-[#fffaf1]/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:px-5">
          <LoadingButton type="submit" loading={loading} disabled={!canSubmit} className="w-full rounded-xl bg-civic px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-civic/90">
            {loading ? t("composer.survey.loading") : (
              <>
                <Save className="h-4 w-4" />
                {t("composer.survey.submit")}
              </>
            )}
          </LoadingButton>
        </footer>
      </form>
    </ComposerModalShell>
  );
}
