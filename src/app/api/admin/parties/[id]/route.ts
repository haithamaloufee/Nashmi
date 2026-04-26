import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { partySchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Party from "@/models/Party";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, partySchema.partial());
    await connectToDatabase();
    const update: Record<string, unknown> = { ...input };
    delete update.createAccount;
    delete update.accountEmail;
    if (input.name || input.shortDescription || input.description || input.vision || input.goals) {
      const current = await Party.findById(id).lean();
      if (!current) throw new Error("NOT_FOUND");
      update.searchNormalized = createSearchText([
        input.name || current.name,
        input.shortDescription || current.shortDescription,
        input.description || current.description,
        input.vision || current.vision,
        ...((input.goals || current.goals || []) as string[])
      ]);
    }
    const party = await Party.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!party) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: actor.id, actorRole: actor.role, action: "admin.party_update", targetType: "party", targetId: id, request });
    return ok({ party: serialize(party) });
  } catch (error) {
    return handleApiError(error);
  }
}
