import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { surveyResponseSchema } from "@/lib/validators";
import { requireRateLimit } from "@/lib/rateLimit";
import { isDuplicateKeyError, readJson, serialize } from "@/lib/routeUtils";
import { buildSurveyResultSummary, canRespondToSurvey, canViewSurveyResults, surveyIdentifierLookup, validateSurveyAnswers } from "@/lib/surveys";
import Survey from "@/models/Survey";
import SurveyResponse from "@/models/SurveyResponse";
import { startSession } from "mongoose";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireActiveUser();
    await requireRateLimit(`survey-response:${user.id}`, 20, 60 * 60 * 1000);
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

    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        const duplicate = await SurveyResponse.exists({ surveyId: survey._id, userId: user.id }).session(session);
        if (duplicate) throw new Error("ALREADY_RESPONDED");
        await SurveyResponse.create([{ surveyId: survey._id, userId: user.id, answers }], { session });
        await Survey.updateOne({ _id: survey._id }, { $inc: { totalResponses: 1 } }, { session });
      });
    } catch (error) {
      if (isDuplicateKeyError(error) || (error instanceof Error && error.message === "ALREADY_RESPONDED")) return fail("CONFLICT", "لقد شاركت سابقًا في هذا الاستبيان.", 409);
      throw error;
    } finally {
      await session.endSession();
    }
    revalidatePath("/updates");
    revalidatePath("/surveys");
    if (survey.slug) revalidatePath(`/surveys/${survey.slug}`);
    const canViewResults = canViewSurveyResults({ survey, viewer: user, hasResponded: true, isManager: false });
    const responses = canViewResults ? await SurveyResponse.find({ surveyId: survey._id }).lean() : [];
    return ok({ hasResponded: true, canViewResults, resultSummary: canViewResults ? buildSurveyResultSummary(survey, serialize(responses) as any, false) : null });
  } catch (error) {
    return handleApiError(error);
  }
}
