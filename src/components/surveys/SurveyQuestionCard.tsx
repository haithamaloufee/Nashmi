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
  return (
    <fieldset className="card bg-white p-5 dark:bg-slate-950" disabled={disabled}>
      <legend className="mb-3 w-full">
        <span className="text-sm font-black text-civic">السؤال {index + 1}</span>
        <h3 className="mt-1 text-lg font-black">{question.title} {question.required ? <span className="text-red-600">*</span> : null}</h3>
        {question.description ? <p className="mt-1 text-sm text-ink/65 dark:text-slate-300">{question.description}</p> : null}
      </legend>

      {(question.type === "SINGLE_CHOICE" || question.type === "YES_NO") ? (
        <div className="grid gap-2">
          {(question.options || []).map((option) => (
            <label key={option._id} className="flex cursor-pointer items-center gap-3 rounded border border-line bg-paper/60 p-3 font-semibold hover:border-civic dark:bg-slate-900">
              <input type="radio" name={name} checked={value?.optionId === option._id} onChange={() => onChange({ questionId: question._id, optionId: option._id })} className="text-civic focus:ring-civic" />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}

      {question.type === "MULTIPLE_CHOICE" ? (
        <div className="grid gap-2">
          {(question.options || []).map((option) => {
            const selected = Array.isArray(value?.optionIds) ? value.optionIds : [];
            return (
              <label key={option._id} className="flex cursor-pointer items-center gap-3 rounded border border-line bg-paper/60 p-3 font-semibold hover:border-civic dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={selected.includes(option._id)}
                  onChange={(event) => {
                    const next = event.target.checked ? [...selected, option._id] : selected.filter((id: string) => id !== option._id);
                    onChange({ questionId: question._id, optionIds: next });
                  }}
                  className="rounded text-civic focus:ring-civic"
                />
                {option.label}
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
              className={`h-11 w-11 rounded-full border text-sm font-black ${value?.valueNumber === rating ? "border-civic bg-civic text-white" : "border-line bg-white text-ink hover:border-civic dark:bg-slate-900 dark:text-white"}`}
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
          rows={4}
          maxLength={1000}
          className="w-full rounded border-line"
          placeholder="اكتب إجابتك هنا"
        />
      ) : null}
    </fieldset>
  );
}
