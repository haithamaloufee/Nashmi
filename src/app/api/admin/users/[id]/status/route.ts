import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { adminUserStatusSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, adminUserStatusSchema);
    await connectToDatabase();
    const target = await User.findById(id);
    if (!target) throw new Error("NOT_FOUND");
    if ((target.role === "admin" || target.role === "super_admin") && actor.role !== "super_admin") {
      return fail("FORBIDDEN", "تغيير حالة حساب إداري حساس يتطلب super_admin", 403);
    }

    const previousStatus = target.status;
    target.status = input.status;
    await target.save();
    const safe = target.toObject() as Record<string, unknown>;
    delete safe.passwordHash;
    await writeAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "admin.user_status_update",
      targetType: "user",
      targetId: id,
      metadata: { previousStatus, status: input.status },
      request
    });
    return ok({ user: serialize(safe) });
  } catch (error) {
    return handleApiError(error);
  }
}
