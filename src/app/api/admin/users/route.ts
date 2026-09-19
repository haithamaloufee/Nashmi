import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { adminUserCreateSchema } from "@/lib/validators";
import { normalizeEmail } from "@/lib/security";
import { readJson, isDuplicateKeyError, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import User from "@/models/User";
import { buildAccountSetupUrl, createAccountSetup } from "@/lib/accountSetup";
import { accountInvitationEmail } from "@/lib/emailTemplates";
import { sendTransactionalEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const filter = search
      ? { $or: [{ name: new RegExp(search, "i") }, { emailNormalized: new RegExp(search.toLowerCase(), "i") }] }
      : {};
    const users = await User.find(filter).select("+passwordHash").sort({ createdAt: -1 }).limit(100).lean();
    const safeUsers = users.map((user) => {
      const safe = user as Record<string, unknown>;
      safe.setupInvitationEligible = !safe.passwordHash;
      delete safe.passwordHash;
      return safe;
    });
    return ok({ users: serialize(safeUsers) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const input = await readJson(request, adminUserCreateSchema);
    if ((input.role === "admin" || input.role === "super_admin") && actor.role !== "super_admin") {
      return fail("FORBIDDEN", "تغيير أو إنشاء أدوار الإدارة العليا يتطلب super_admin", 403);
    }
    await connectToDatabase();
    const setup = createAccountSetup();
    const user = await User.create({
      name: input.name,
      email: input.email.trim(),
      emailNormalized: normalizeEmail(input.email),
      emailVerified: false,
      passwordHash: null,
      passwordSetupTokenHash: setup.tokenHash,
      passwordSetupExpiresAt: setup.expiresAt,
      passwordSetupTargetStatus: input.status || "active",
      role: input.role || "citizen",
      provider: "credentials",
      status: "pending",
      language: "ar"
    });
    await writeAuditLog({ actorUserId: actor.id, actorRole: actor.role, action: "admin.user_create", targetType: "user", targetId: user._id, metadata: { role: input.role || "citizen" }, request });
    const safe = user.toObject() as Record<string, unknown>;
    delete safe.passwordHash;
    delete safe.passwordSetupTokenHash;
    delete safe.passwordSetupExpiresAt;
    delete safe.passwordSetupTargetStatus;
    delete safe.sessionVersion;
    let invitationSent = false;
    try {
      invitationSent = (await sendTransactionalEmail(user.email, accountInvitationEmail(user.language, buildAccountSetupUrl(setup.token)))).sent;
    } catch { /* The pending account can be invited again safely. */ }
    return ok({ user: serialize(safe), invitationSent, setupExpiresAt: setup.expiresAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) return fail("CONFLICT", "البريد الإلكتروني مستخدم بالفعل", 409);
    return handleApiError(error);
  }
}
