import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { adminUserRoleSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    const input = await readJson(request, adminUserRoleSchema);
    await connectToDatabase();
    const target = await User.findById(id);
    if (!target) throw new Error("NOT_FOUND");

    const touchesSensitiveRole =
      input.role === "admin" ||
      input.role === "super_admin" ||
      target.role === "admin" ||
      target.role === "super_admin";
    if (touchesSensitiveRole && actor.role !== "super_admin") {
      return fail("FORBIDDEN", "لا يمكن تغيير الأدوار الحساسة إلا بواسطة super_admin", 403);
    }

    const previousRole = target.role;
    target.role = input.role;
    await target.save();
    const safe = target.toObject() as Record<string, unknown>;
    delete safe.passwordHash;
    await writeAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "admin.user_role_update",
      targetType: "user",
      targetId: id,
      metadata: { previousRole, role: input.role },
      request
    });
    return ok({ user: serialize(safe) });
  } catch (error) {
    return handleApiError(error);
  }
}
