import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { surveyResponseSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { isDuplicateKeyError, readJson, serialize } from "@/lib/routeUtils";
import { buildSurveyResultSummary, canRespondToSurvey, surveyIdentifierLookup, validateSurveyAnswers } from "@/lib/surveys";
import Survey from "@/models/Survey";
import SurveyResponse from "@/models/SurveyResponse";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser();
    requireRateLimit(`survey-response:${user.id}`, 20, 60 * 60 * 1000);
    const { id } = await context.params;
    const input = await readJson(request, surveyResponseSchema);
    await connectToDatabase();
    const lookup = surveyIdentifierLookup(id);
    if (!lookup) throw new Error("NOT_FOUND");
    const survey = await Survey.findOne(lookup);
    if (!survey || survey.status !== "published") throw new Error("NOT_FOUND");
    const hasResponded = Boolean(await SurveyResponse.exists({ surveyId: survey._id, userId: user.id }));
    if (!canRespondToSurvey(survey, user, hasResponded)) return fail("BAD_REQUEST", hasResponded ? "لقد شاركت سابقًا في هذا الاستبيان." : "الاستبيان غير متاح للمشاركة حاليًا.", 400);
    let answers;
    try {
      answers = validateSurveyAnswers(survey, input.answers);
    } catch (error) {
      const message = error instanceof Error && error.message === "TEXT_ANSWER_TOO_LONG" ? "الإجابة النصية طويلة جدًا." : "يرجى الإجابة عن الأسئلة المطلوبة بشكل صحيح.";
      return fail("VALIDATION_ERROR", message, 422);
    }

    try {
      await SurveyResponse.create({ surveyId: survey._id, userId: user.id, answers });
    } catch (error) {
      if (isDuplicateKeyError(error)) return fail("CONFLICT", "لقد شاركت سابقًا في هذا الاستبيان.", 409);
      throw error;
    }

    await Survey.updateOne({ _id: survey._id }, { $inc: { totalResponses: 1 } });
    const responses = await SurveyResponse.find({ surveyId: survey._id }).lean();
    return ok({ hasResponded: true, resultSummary: buildSurveyResultSummary(survey, serialize(responses) as any, false) });
  } catch (error) {
    return handleApiError(error);
  }
}
