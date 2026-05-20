import { isAdmin, normalizeOwnershipId, type Role } from "@/lib/permissions";

export const surveyQuestionTypes = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO", "RATING", "TEXT"] as const;
export type SurveyQuestionType = (typeof surveyQuestionTypes)[number];
export const surveyStatuses = ["draft", "published", "closed", "archived", "deleted"] as const;
export type SurveyStatus = (typeof surveyStatuses)[number];
export const surveyResultVisibilities = ["BEFORE_SUBMIT", "AFTER_SUBMIT", "PUBLISHER_ONLY"] as const;
export type SurveyResultVisibility = (typeof surveyResultVisibilities)[number];
export type SurveyLifecycleStatus = "draft" | "upcoming" | "open" | "closed" | "archived" | "deleted";

export type SurveyQuestionLike = {
  _id?: unknown;
  id?: unknown;
  title: string;
  description?: string | null;
  type: SurveyQuestionType;
  required?: boolean | null;
  order?: number | null;
  options?: Array<{ _id?: unknown; id?: unknown; label: string; value?: string | null; order?: number | null }>;
};

export type SurveyLike = {
  _id?: unknown;
  id?: unknown;
  status?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  resultsVisibility?: SurveyResultVisibility | string | null;
  authorType?: string | null;
  authorUserId?: unknown;
  partyId?: unknown;
  questions?: SurveyQuestionLike[];
  totalResponses?: number | null;
  updatedAt?: string | Date | null;
};

export type SurveyAnswerInput = {
  questionId: string;
  optionId?: string | null;
  optionIds?: string[];
  valueText?: string | null;
  valueNumber?: number | null;
};

export type SurveyResponseLike = {
  _id?: unknown;
  id?: unknown;
  createdAt?: string | Date | null;
  answers?: SurveyAnswerInput[];
};

const dayMs = 24 * 60 * 60 * 1000;

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function objectIdString(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown; toString?: () => string };
    if (record._id) return objectIdString(record._id);
    if (record.id) return objectIdString(record.id);
    if (typeof record.toString === "function") return record.toString();
  }
  return String(value);
}

export function sortedSurveyQuestions<T extends SurveyQuestionLike>(questions: T[] = []) {
  return [...questions].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
}

export function sortedSurveyOptions<T extends { order?: number | null; label: string }>(options: T[] = []) {
  return [...options].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
}

export function normalizeSurveySlug(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return base || "survey";
}

export function generateSurveySlug(title: string) {
  return `${normalizeSurveySlug(title)}-${Date.now().toString(36)}`;
}

export function getSurveyLifecycleStatus(survey: SurveyLike, now = Date.now()): SurveyLifecycleStatus {
  if (survey.status === "deleted") return "deleted";
  if (survey.status === "archived") return "archived";
  if (survey.status === "draft") return "draft";
  if (survey.status === "closed") return "closed";
  const startsAt = toDate(survey.startsAt);
  const endsAt = toDate(survey.endsAt);
  if (startsAt && startsAt.getTime() > now) return "upcoming";
  if (endsAt && endsAt.getTime() <= now) return "closed";
  return survey.status === "published" ? "open" : "draft";
}

export function canRespondToSurvey(survey: SurveyLike, user: { id: string; role: Role; status?: string } | null, hasResponded: boolean, now = Date.now()) {
  if (!user || user.status === "disabled" || user.status === "locked") return false;
  if (hasResponded) return false;
  return getSurveyLifecycleStatus(survey, now) === "open";
}

export function canManageSurvey(user: { id: string; role: Role } | null, survey: SurveyLike) {
  if (!user) return false;
  if (isAdmin(user.role)) return true;
  if (user.role === "party" && survey.authorType === "party") return normalizeOwnershipId(survey.authorUserId) === user.id;
  if (user.role === "iec" && survey.authorType === "iec") return normalizeOwnershipId(survey.authorUserId) === user.id;
  return false;
}

export function canViewSurveyResults(input: {
  survey: SurveyLike;
  viewer: { id: string; role: Role } | null;
  hasResponded: boolean;
  isManager: boolean;
}) {
  if (input.isManager) return true;
  const visibility = input.survey.resultsVisibility || "BEFORE_SUBMIT";
  if (visibility === "BEFORE_SUBMIT") return true;
  if (visibility === "AFTER_SUBMIT") return input.hasResponded;
  return false;
}

export function normalizeSurveyQuestionsForSave(questions: SurveyQuestionLike[]) {
  return sortedSurveyQuestions(questions).map((question, index) => {
    const type = question.type;
    const options = type === "YES_NO"
      ? [
          { label: "نعم", value: "yes", order: 0 },
          { label: "لا", value: "no", order: 1 }
        ]
      : sortedSurveyOptions(question.options || []).map((option, optionIndex) => ({
          ...(option.id || option._id ? { _id: objectIdString(option.id || option._id) } : {}),
          label: option.label.trim(),
          value: option.value?.trim() || null,
          order: Number.isFinite(Number(option.order)) ? Number(option.order) : optionIndex
        }));
    return {
      ...(question.id || question._id ? { _id: objectIdString(question.id || question._id) } : {}),
      title: question.title.trim(),
      description: question.description?.trim() || null,
      type,
      required: question.required !== false,
      order: Number.isFinite(Number(question.order)) ? Number(question.order) : index,
      options: type === "RATING" || type === "TEXT" ? [] : options
    };
  });
}

export function validateSurveyAnswers(survey: SurveyLike, answers: SurveyAnswerInput[]) {
  const questions = sortedSurveyQuestions(survey.questions || []);
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const normalized: SurveyAnswerInput[] = [];

  for (const question of questions) {
    const questionId = objectIdString(question._id || question.id);
    const answer = answersByQuestion.get(questionId);
    const required = question.required !== false;
    const optionIds = new Set((question.options || []).map((option) => objectIdString(option._id || option.id)));

    if (!answer) {
      if (required) throw new Error("REQUIRED_ANSWER_MISSING");
      continue;
    }

    if (question.type === "SINGLE_CHOICE" || question.type === "YES_NO") {
      const optionId = answer.optionId || "";
      if (!optionId && required) throw new Error("REQUIRED_ANSWER_MISSING");
      if (optionId && !optionIds.has(optionId)) throw new Error("INVALID_OPTION");
      if (optionId) normalized.push({ questionId, optionId });
      continue;
    }

    if (question.type === "MULTIPLE_CHOICE") {
      const selected = Array.isArray(answer.optionIds) ? [...new Set(answer.optionIds)] : [];
      if (!selected.length && required) throw new Error("REQUIRED_ANSWER_MISSING");
      if (selected.some((optionId) => !optionIds.has(optionId))) throw new Error("INVALID_OPTION");
      if (selected.length) normalized.push({ questionId, optionIds: selected });
      continue;
    }

    if (question.type === "RATING") {
      const value = Number(answer.valueNumber);
      if ((!Number.isFinite(value) || value < 1 || value > 5) && required) throw new Error("REQUIRED_ANSWER_MISSING");
      if (Number.isFinite(value) && value >= 1 && value <= 5) normalized.push({ questionId, valueNumber: value });
      continue;
    }

    if (question.type === "TEXT") {
      const value = String(answer.valueText || "").trim();
      if (!value && required) throw new Error("REQUIRED_ANSWER_MISSING");
      if (value.length > 1000) throw new Error("TEXT_ANSWER_TOO_LONG");
      if (value) normalized.push({ questionId, valueText: value });
    }
  }

  return normalized;
}

export function buildSurveyResultSummary(survey: SurveyLike, responses: SurveyResponseLike[], includeTextAnswers = false) {
  const totalResponses = responses.length;
  const latestResponse = responses
    .map((response) => toDate(response.createdAt)?.getTime() || 0)
    .sort((a, b) => b - a)[0];

  const questions = sortedSurveyQuestions(survey.questions || []).map((question) => {
    const questionId = objectIdString(question._id || question.id);
    const answers = responses.flatMap((response) => response.answers || []).filter((answer) => objectIdString(answer.questionId) === questionId);
    const optionCounts = new Map<string, number>();
    const ratingCounts = new Map<number, number>();
    let ratingTotal = 0;
    let textCount = 0;
    const textAnswers: string[] = [];

    for (const answer of answers) {
      if (answer.optionId) {
        const optionId = objectIdString(answer.optionId);
        optionCounts.set(optionId, (optionCounts.get(optionId) || 0) + 1);
      }
      for (const rawOptionId of answer.optionIds || []) {
        const optionId = objectIdString(rawOptionId);
        optionCounts.set(optionId, (optionCounts.get(optionId) || 0) + 1);
      }
      if (typeof answer.valueNumber === "number") {
        ratingCounts.set(answer.valueNumber, (ratingCounts.get(answer.valueNumber) || 0) + 1);
        ratingTotal += answer.valueNumber;
      }
      if (answer.valueText) {
        textCount += 1;
        if (includeTextAnswers) textAnswers.push(answer.valueText);
      }
    }

    const denominator = question.type === "MULTIPLE_CHOICE"
      ? Array.from(optionCounts.values()).reduce((sum, count) => sum + count, 0)
      : Math.max(answers.length, 1);

    const options = sortedSurveyOptions(question.options || []).map((option) => {
      const count = optionCounts.get(objectIdString(option._id || option.id)) || 0;
      return {
        id: objectIdString(option._id || option.id),
        label: option.label,
        count,
        percentage: denominator > 0 ? Math.round((count / denominator) * 100) : 0
      };
    });

    const ratingDistribution = [1, 2, 3, 4, 5].map((value) => {
      const count = ratingCounts.get(value) || 0;
      return {
        value,
        count,
        percentage: answers.length > 0 ? Math.round((count / answers.length) * 100) : 0
      };
    });

    return {
      id: questionId,
      title: question.title,
      type: question.type,
      totalAnswers: answers.length,
      options,
      ratingDistribution,
      averageRating: question.type === "RATING" && answers.length > 0 ? Math.round((ratingTotal / answers.length) * 10) / 10 : null,
      textAnswerCount: textCount,
      textAnswers: includeTextAnswers ? textAnswers : []
    };
  });

  return {
    totalResponses,
    lastUpdatedAt: latestResponse ? new Date(latestResponse).toISOString() : toDate(survey.updatedAt)?.toISOString() || null,
    questions,
    staleAfterMs: dayMs
  };
}
