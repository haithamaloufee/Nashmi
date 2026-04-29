import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { authorityLogoUpdateSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import AuthorityProfile from "@/models/AuthorityProfile";

export async function GET() {
  try {
    await requireActiveUser(["iec"]);
    await connectToDatabase();
    const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission" }).lean();
    if (!authority) throw new Error("NOT_FOUND");
    return ok({ authority: serialize(authority) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser(["iec"]);
    const input = await readJson(request, authorityLogoUpdateSchema);
    await connectToDatabase();
    const authority = await AuthorityProfile.findOneAndUpdate({ slug: "independent-election-commission" }, { $set: input }, { new: true }).lean();
    if (!authority) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "iec.profile_update", targetType: "authority", targetId: authority._id, request });
    return ok({ authority: serialize(authority) });
  } catch (error) {
    return handleApiError(error);
  }
}
