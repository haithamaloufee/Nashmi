import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { getCurrentUser, requireActiveUser } from "@/lib/auth";
import { createSearchText } from "@/lib/arabicSearch";
import { contentCreatorRoles } from "@/lib/permissions";
import { surveyUpdateSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import {
  buildSurveyResultSummary,
  canManageSurvey,
  canRespondToSurvey,
  canViewSurveyResults,
  generateSurveySlug,
  getSurveyLifecycleStatus,
  normalizeSurveyQuestionsForSave
} from "@/lib/surveys";
import Survey from "@/models/Survey";
import SurveyResponse from "@/models/SurveyResponse";
import Party from "@/models/Party";

type Context = { params: Promise<{ id: string }> };

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function surveyLookup(id: string) {
  return isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
}

async function revalidateSurveySurfaces(survey: { slug?: string; partyId?: unknown; authorType?: string }) {
  revalidatePath("/surveys");
  if (survey.slug) revalidatePath(`/surveys/${survey.slug}`);
  if (survey.authorType === "iec") revalidatePath("/iec");
  if (survey.partyId) {
    const party = await Party.findById(survey.partyId).select("slug").lean();
    if (party?.slug) revalidatePath(`/parties/${party.slug}`);
  }
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await connectToDatabase();
    const viewer = await getCurrentUser();
    const survey = await Survey.findOne(surveyLookup(id))
      .populate({ path: "authorUserId", select: "name avatarUrl image role" })
      .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
      .lean();
    if (!survey || survey.status === "deleted") throw new Error("NOT_FOUND");
    const isManager = canManageSurvey(viewer, survey);
    if (!isManager && !["published", "closed"].includes(String(survey.status))) throw new Error("NOT_FOUND");

    const hasResponded = viewer ? Boolean(await SurveyResponse.exists({ surveyId: survey._id, userId: viewer.id })) : false;
    const canViewResults = canViewSurveyResults({ survey, viewer, hasResponded, isManager });
    const responses = canViewResults ? await SurveyResponse.find({ surveyId: survey._id }).lean() : [];
    const resultSummary = canViewResults ? buildSurveyResultSummary(survey, serialize(responses) as any, isManager) : null;

    return ok({
      survey: serialize({
        ...survey,
        lifecycleStatus: getSurveyLifecycleStatus(survey),
        hasResponded,
        canRespond: canRespondToSurvey(survey, viewer, hasResponded),
        canViewResults,
        resultSummary
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(contentCreatorRoles);
    const { id } = await context.params;
    const input = await readJson(request, surveyUpdateSchema);
    await connectToDatabase();
    const survey = await Survey.findOne(surveyLookup(id));
    if (!survey || survey.status === "deleted") throw new Error("NOT_FOUND");
    if (!canManageSurvey(user, survey)) return fail("FORBIDDEN", "تعديل الاستبيان متاح للناشر أو الإدارة فقط.", 403);

    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description || null;
    if (input.slug !== undefined) update.slug = input.slug || generateSurveySlug(input.title || survey.title);
    if (input.resultsVisibility !== undefined) update.resultsVisibility = input.resultsVisibility;
    if (input.startsAt !== undefined) update.startsAt = parseDate(input.startsAt);
    if (input.endsAt !== undefined) update.endsAt = parseDate(input.endsAt);
    if (input.status !== undefined) {
      update.status = input.status;
      if (input.status === "published" && !survey.publishedAt) update.publishedAt = new Date();
    }
    if (input.questions !== undefined) update.questions = normalizeSurveyQuestionsForSave(input.questions);
    const nextQuestions = (update.questions as any[] | undefined) || survey.questions;
    update.searchNormalized = createSearchText([
      String(update.title ?? survey.title),
      String(update.description ?? survey.description ?? ""),
      ...nextQuestions.flatMap((question: any) => [question.title, ...(question.options || []).map((option: any) => option.label)])
    ]);

    const updated = await Survey.findByIdAndUpdate(survey._id, { $set: update }, { new: true }).lean();
    await revalidateSurveySurfaces(updated || survey);
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "survey.update", targetType: "survey", targetId: survey._id, request });
    return ok({ survey: serialize(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(contentCreatorRoles);
    const { id } = await context.params;
    await connectToDatabase();
    const survey = await Survey.findOne(surveyLookup(id));
    if (!survey || survey.status === "deleted") throw new Error("NOT_FOUND");
    if (!canManageSurvey(user, survey)) return fail("FORBIDDEN", "أرشفة الاستبيان متاحة للناشر أو الإدارة فقط.", 403);
    survey.status = "archived";
    await survey.save();
    await revalidateSurveySurfaces(survey);
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "survey.archive", targetType: "survey", targetId: survey._id, request });
    return ok({ archived: true });
  } catch (error) {
    return handleApiError(error);
  }
}
