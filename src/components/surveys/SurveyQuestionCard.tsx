"use client";

type Question = {
  _id: string;
  title: string;
  description?: string | null;
  type: string;
  required?: boolean;
  options?: Array<{ _id: string; label: string }>;
};

export default function SurveyQuestionCard({ question, index, value, onChange, disabled = false }: { question: Question; index: number; value: any; onChange: (value: any) => void; disabled?: boolean }) {
  const name = `survey-question-${question._id}`;
  const optionClass = "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-ink transition hover:border-civic hover:bg-civic/5 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-civic/10";
  const inputClass = "shrink-0 text-civic focus:ring-civic";

  return (
    <fieldset className="rounded-lg border border-line bg-white p-5 shadow-sm dark:bg-slate-950" disabled={disabled}>
      <legend className="mb-4 w-full">
        <span className="text-sm font-bold text-ink/55 dark:text-slate-400">السؤال {index + 1}</span>
        <h3 className="mt-1 text-lg font-black leading-8 text-slate-950 dark:text-white">
          {question.title} {question.required ? <span className="text-red-600">*</span> : null}
        </h3>
        {question.description ? <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-slate-300">{question.description}</p> : null}
      </legend>

      {question.type === "SINGLE_CHOICE" || question.type === "YES_NO" ? (
        <div className="grid gap-3">
          {(question.options || []).map((option) => (
            <label key={option._id} className={optionClass}>
              <span>{option.label}</span>
              <input type="radio" name={name} checked={value?.optionId === option._id} onChange={() => onChange({ questionId: question._id, optionId: option._id })} className={inputClass} />
            </label>
          ))}
        </div>
      ) : null}

      {question.type === "MULTIPLE_CHOICE" ? (
        <div className="grid gap-3">
          {(question.options || []).map((option) => {
            const selected = Array.isArray(value?.optionIds) ? value.optionIds : [];
            return (
              <label key={option._id} className={optionClass}>
                <span>{option.label}</span>
                <input
                  type="checkbox"
                  checked={selected.includes(option._id)}
                  onChange={(event) => {
                    const next = event.target.checked ? [...selected, option._id] : selected.filter((id: string) => id !== option._id);
                    onChange({ questionId: question._id, optionIds: next });
                  }}
                  className={`${inputClass} rounded`}
                />
              </label>
            );
          })}
        </div>
      ) : null}

      {question.type === "RATING" ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange({ questionId: question._id, valueNumber: rating })}
              className={`h-11 w-11 rounded-full border text-sm font-black transition ${value?.valueNumber === rating ? "border-civic bg-civic text-white" : "border-slate-300 bg-white text-ink hover:border-civic dark:border-slate-700 dark:bg-slate-950 dark:text-white"}`}
            >
              {rating}
            </button>
          ))}
        </div>
      ) : null}

      {question.type === "TEXT" ? (
        <textarea
          value={value?.valueText || ""}
          onChange={(event) => onChange({ questionId: question._id, valueText: event.target.value })}
          rows={5}
          maxLength={1000}
          className="w-full rounded-lg border-slate-300 bg-white leading-7 dark:border-slate-700 dark:bg-slate-950"
          placeholder="اكتب إجابتك هنا"
        />
      ) : null}
    </fieldset>
  );
}
