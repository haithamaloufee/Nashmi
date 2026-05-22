import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { getCurrentUser, requireActiveUser } from "@/lib/auth";
import { createSearchText, searchRegex } from "@/lib/arabicSearch";
import { authorTypeForRole, contentCreatorRoles, isAdmin } from "@/lib/permissions";
import { surveyCreateSchema } from "@/lib/validators";
import { buildPublisherSnapshot, getAuthorityAuthor } from "@/lib/publisher";
import { readJson, requirePartyForUser, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import { generateSurveySlug, getSurveyLifecycleStatus, normalizeSurveyQuestionsForSave, normalizeSurveySlug } from "@/lib/surveys";
import Survey from "@/models/Survey";
import Party from "@/models/Party";

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function uniqueSurveySlug(base: string) {
  const normalizedBase = normalizeSurveySlug(base);
  let candidate = normalizedBase;
  let suffix = 1;
  while (await Survey.exists({ slug: candidate })) {
    suffix += 1;
    candidate = `${normalizedBase}-${suffix}`;
  }
  return candidate;
}

async function resolveAuthor(input: { user: { id: string; name: string; role: any; avatarUrl?: string | null; image?: string | null }; partyId?: string | null; publisherType?: "party" | "iec" | "admin" }) {
  if (input.user.role === "party") {
    const party = await requirePartyForUser(input.user.id);
    return { authorType: "party" as const, partyId: String(party._id) };
  }
  if (input.user.role === "iec") return { authorType: "iec" as const, partyId: null };

  const authorType = isAdmin(input.user.role)
    ? (input.publisherType || (input.partyId ? "party" : "admin"))
    : authorTypeForRole(input.user.role);
  if (authorType === "party") {
    if (!input.partyId) throw new Error("BAD_REQUEST");
    const party = await Party.findById(input.partyId).select("_id").lean();
    if (!party) throw new Error("NOT_FOUND");
    return { authorType, partyId: String(party._id) };
  }
  return { authorType, partyId: null };
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const publisherType = url.searchParams.get("publisherType");
    const partyId = url.searchParams.get("partyId");
    const status = url.searchParams.get("status");
    const sort = url.searchParams.get("sort") || "newest";
    const regex = search ? searchRegex(search) : null;

    const query: Record<string, unknown> = isAdmin(user?.role) && status === "all"
      ? { status: { $ne: "deleted" } }
      : { status: { $in: ["published", "closed"] } };
    if (status && status !== "all" && ["draft", "published", "closed", "archived"].includes(status)) query.status = status;
    if (publisherType === "party") query.authorType = "party";
    if (publisherType === "authority" || publisherType === "iec") query.authorType = "iec";
    if (publisherType === "platform" || publisherType === "admin") query.authorType = "admin";
    if (partyId) query.partyId = partyId;
    if (regex) query.searchNormalized = regex;

    const surveys = await Survey.find(query)
      .populate({ path: "authorUserId", select: "name avatarUrl image role" })
      .populate({ path: "partyId", select: "name slug logoUrl isVerified" })
      .sort(sort === "most_participated" ? { totalResponses: -1, publishedAt: -1 } : { publishedAt: -1, createdAt: -1 })
      .limit(80)
      .lean();

    const authorityAuthor = await getAuthorityAuthor();
    const data = surveys.map((survey) => ({
      ...survey,
      lifecycleStatus: getSurveyLifecycleStatus(survey),
      authorityAuthor: survey.authorType === "iec" ? authorityAuthor : undefined
    }));
    return ok({ surveys: serialize(data) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(contentCreatorRoles);
    const input = await readJson(request, surveyCreateSchema);
    await connectToDatabase();

    const author = await resolveAuthor({ user, partyId: input.partyId, publisherType: input.publisherType });
    const questions = normalizeSurveyQuestionsForSave(input.questions);
    const publishedAt = input.status === "published" ? new Date() : null;
    const slug = await uniqueSurveySlug(input.slug || generateSurveySlug(input.title));
    const publisherSnapshot = await buildPublisherSnapshot({
      authorType: author.authorType,
      partyId: author.partyId,
      authorUser: user
    });

    const survey = await Survey.create({
      title: input.title,
      slug,
      description: input.description || null,
      authorType: author.authorType,
      authorUserId: user.id,
      partyId: author.partyId,
      publisherSnapshot,
      status: input.status,
      resultsVisibility: input.resultsVisibility,
      startsAt: parseDate(input.startsAt),
      endsAt: parseDate(input.endsAt),
      publishedAt,
      questions,
      searchNormalized: createSearchText([input.title, input.description || "", ...questions.flatMap((question) => [question.title, ...(question.options || []).map((option) => option.label)])])
    });

    revalidatePath("/surveys");
    revalidatePath("/updates");
    if (author.authorType === "iec") revalidatePath("/iec");
    if (author.partyId) {
      const party = await Party.findById(author.partyId).select("slug").lean();
      if (party?.slug) revalidatePath(`/parties/${party.slug}`);
    }
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "survey.create", targetType: "survey", targetId: survey._id, metadata: { authorType: author.authorType, partyId: author.partyId }, request });
    return ok({ survey: serialize(survey) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
