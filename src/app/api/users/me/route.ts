import { connectToDatabase } from "@/lib/db";
import { ok, handleApiError } from "@/lib/apiResponse";
import { requireUser, requireActiveUser, safeUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validators";
import { readJson } from "@/lib/routeUtils";
import { stripHtml } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";

export async function GET() {
  try {
    return ok({ user: await requireUser() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const current = await requireActiveUser();
    const input = await readJson(request, profileUpdateSchema);
    await connectToDatabase();
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.bio !== undefined) update.bio = input.bio ? stripHtml(input.bio) : null;
    if (input.language !== undefined) update.language = input.language;
    const user = await User.findByIdAndUpdate(current.id, { $set: update }, { new: true });
    if (!user) throw new Error("NOT_FOUND");
    await writeAuditLog({ actorUserId: current.id, actorRole: current.role, action: "user.profile_update", targetType: "user", targetId: current.id, request });
    return ok({ user: safeUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
