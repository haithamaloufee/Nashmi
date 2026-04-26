import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { lawSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Law from "@/models/Law";
import LawVersion from "@/models/LawVersion";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["iec", "admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, lawSchema.partial());
    await connectToDatabase();
    const current = await Law.findById(id);
    if (!current) throw new Error("NOT_FOUND");

    const meaningChanged =
      (input.title !== undefined && input.title !== current.title) ||
      (input.originalText !== undefined && input.originalText !== current.originalText) ||
      (input.simplifiedExplanation !== undefined && input.simplifiedExplanation !== current.simplifiedExplanation);
    if (meaningChanged) {
      await LawVersion.create({
        lawId: current._id,
        title: current.title,
        originalText: current.originalText,
        simplifiedExplanation: current.simplifiedExplanation,
        changedByUserId: user.id,
        changeReason: input.changeReason || "تحديث محتوى القانون"
      });
    }

    const update: Record<string, unknown> = { ...input };
    delete update.changeReason;
    if (input.officialReferenceUrl !== undefined) update.officialReferenceUrl = input.officialReferenceUrl || null;
    if (input.thumbnailUrl !== undefined) update.thumbnailUrl = input.thumbnailUrl || null;
    if (input.youtubeVideoId !== undefined) update.youtubeVideoId = input.youtubeVideoId || null;
    update.updatedByUserId = user.id;
    update.reviewedByUserId = user.id;
    update.lastVerifiedAt = new Date();
    update.searchNormalized = createSearchText([
      input.title || current.title,
      input.category || current.category,
      input.shortDescription || current.shortDescription,
      input.simplifiedExplanation || current.simplifiedExplanation,
      input.originalText || current.originalText || "",
      ...((input.tags || current.tags || []) as string[])
    ]);
    const law = await Law.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "law.update", targetType: "law", targetId: id, metadata: { meaningChanged }, request });
    return ok({ law: serialize(law) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireActiveUser(["iec", "admin", "super_admin"]);
    const { id } = await context.params;
    await connectToDatabase();
    const law = await Law.findByIdAndUpdate(id, { $set: { status: "hidden", updatedByUserId: user.id } }, { new: true }).lean();
    if (!law) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "law.hide", targetType: "law", targetId: id, request });
    return ok({ law: serialize(law) });
  } catch (error) {
    return handleApiError(error);
  }
}
