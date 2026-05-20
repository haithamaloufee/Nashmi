import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { getCurrentUser } from "@/lib/auth";
import { serialize } from "@/lib/routeUtils";
import { buildSurveyResultSummary, canManageSurvey, canViewSurveyResults } from "@/lib/surveys";
import Survey from "@/models/Survey";
import SurveyResponse from "@/models/SurveyResponse";

type Context = { params: Promise<{ id: string }> };

function surveyLookup(id: string) {
  return isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const viewer = await getCurrentUser();
    const survey = await Survey.findOne(surveyLookup(id)).lean();
    if (!survey || survey.status === "deleted") throw new Error("NOT_FOUND");
    const isManager = canManageSurvey(viewer, survey);
    if (!isManager && !["published", "closed"].includes(String(survey.status))) throw new Error("NOT_FOUND");
    const hasResponded = viewer ? Boolean(await SurveyResponse.exists({ surveyId: survey._id, userId: viewer.id })) : false;
    const canViewResults = canViewSurveyResults({ survey, viewer, hasResponded, isManager });
    if (!canViewResults) return ok({ canViewResults: false, resultSummary: null });
    const responses = await SurveyResponse.find({ surveyId: survey._id }).lean();
    return ok({ canViewResults: true, resultSummary: buildSurveyResultSummary(survey, serialize(responses) as any, isManager) });
  } catch (error) {
    return handleApiError(error);
  }
}
