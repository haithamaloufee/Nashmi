import { revalidatePath } from "next/cache";
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
  normalizeSurveySlug,
  normalizeSurveyQuestionsForSave,
  surveyIdentifierLookup,
  surveyQuestionStructureChanged
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

async function uniqueSurveySlug(base: string, surveyId: unknown) {
  const normalizedBase = normalizeSurveySlug(base);
  let candidate = normalizedBase;
  let suffix = 1;
  while (await Survey.exists({ slug: candidate, _id: { $ne: surveyId } })) {
    suffix += 1;
    candidate = `${normalizedBase}-${suffix}`;
  }
  return candidate;
}

async function revalidateSurveySurfaces(survey: { slug?: string; partyId?: unknown; authorType?: string }) {
  revalidatePath("/surveys");
  revalidatePath("/updates");
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
    const lookup = surveyIdentifierLookup(id);
    if (!lookup) throw new Error("NOT_FOUND");
    const survey = await Survey.findOne(lookup)
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
    const lookup = surveyIdentifierLookup(id);
    if (!lookup) throw new Error("NOT_FOUND");
    const survey = await Survey.findOne(lookup);
    if (!survey || survey.status === "deleted") throw new Error("NOT_FOUND");
    if (!canManageSurvey(user, survey)) return fail("FORBIDDEN", "تعديل الاستبيان متاح للناشر أو الإدارة فقط.", 403);

    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description || null;
    if (input.slug !== undefined) update.slug = await uniqueSurveySlug(input.slug || generateSurveySlug(input.title || survey.title), survey._id);
    if (input.resultsVisibility !== undefined) update.resultsVisibility = input.resultsVisibility;
    if (input.startsAt !== undefined) update.startsAt = parseDate(input.startsAt);
    if (input.endsAt !== undefined) update.endsAt = parseDate(input.endsAt);
    if (input.status !== undefined) {
      update.status = input.status;
      if (input.status === "published" && !survey.publishedAt) update.publishedAt = new Date();
    }
    if (input.questions !== undefined) {
      const nextQuestions = normalizeSurveyQuestionsForSave(input.questions);
      const responsesCount = await SurveyResponse.countDocuments({ surveyId: survey._id });
      if (responsesCount > 0 && surveyQuestionStructureChanged(survey.questions as any, nextQuestions as any)) {
        return fail("BAD_REQUEST", "لا يمكن تعديل بنية الأسئلة أو الخيارات بعد وجود مشاركات، حفاظًا على دقة النتائج.", 400);
      }
      update.questions = nextQuestions;
    }
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
    const lookup = surveyIdentifierLookup(id);
    if (!lookup) throw new Error("NOT_FOUND");
    const survey = await Survey.findOne(lookup);
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
