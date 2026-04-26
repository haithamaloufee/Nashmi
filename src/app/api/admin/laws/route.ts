import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { canManageLaws } from "@/lib/permissions";
import { lawSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Law from "@/models/Law";

export async function GET() {
  try {
    const user = await requireActiveUser(["iec", "admin", "super_admin"]);
    if (!canManageLaws(user.role)) throw new Error("FORBIDDEN");
    await connectToDatabase();
    const laws = await Law.find({}).sort({ createdAt: -1 }).limit(200).lean();
    return ok({ laws: serialize(laws) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["iec", "admin", "super_admin"]);
    const input = await readJson(request, lawSchema);
    await connectToDatabase();
    const law = await Law.create({
      ...input,
      officialReferenceUrl: input.officialReferenceUrl || null,
      thumbnailUrl: input.thumbnailUrl || null,
      articleNumber: input.articleNumber || null,
      originalText: input.originalText || null,
      practicalExample: input.practicalExample || null,
      youtubeVideoId: input.youtubeVideoId || null,
      createdByUserId: user.id,
      updatedByUserId: null,
      reviewedByUserId: user.id,
      lastVerifiedAt: new Date(),
      searchNormalized: createSearchText([input.title, input.category, input.shortDescription, input.simplifiedExplanation, input.originalText || "", ...(input.tags || [])])
    });
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "law.create", targetType: "law", targetId: law._id, request });
    return ok({ law: serialize(law) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
