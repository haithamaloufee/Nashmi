import { connectToDatabase } from "@/lib/db";
import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { buildAccountSetupUrl, createAccountSetup } from "@/lib/accountSetup";
import { sendTransactionalEmail } from "@/lib/email";
import { accountInvitationEmail } from "@/lib/emailTemplates";
import { canManageUser } from "@/lib/permissions";
import User from "@/models/User";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const { id } = await context.params;
    await connectToDatabase();

    const target = await User.findById(id).select("+passwordHash +passwordSetupTargetStatus");
    if (!target) throw new Error("NOT_FOUND");
    if (!canManageUser(actor, { id: String(target._id), role: target.role })) {
      return fail("FORBIDDEN", "لا تملك صلاحية إعادة إرسال دعوة لهذا الحساب", 403);
    }
    if (target.passwordHash) {
      return fail("CONFLICT", "تم إعداد كلمة مرور لهذا الحساب بالفعل", 409);
    }

    const setup = createAccountSetup();
    target.passwordSetupTokenHash = setup.tokenHash;
    target.passwordSetupExpiresAt = setup.expiresAt;
    target.passwordSetupTargetStatus = target.passwordSetupTargetStatus || (target.status === "pending" ? "active" : target.status);
    target.status = "pending";
    await target.save();

    let invitationSent = false;
    try {
      invitationSent = (
        await sendTransactionalEmail(
          target.email,
          accountInvitationEmail(target.language, buildAccountSetupUrl(setup.token))
        )
      ).sent;
    } catch {
      // The rotated token remains valid so an administrator can safely retry delivery.
    }

    await writeAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "admin.user_setup_invitation_resend",
      targetType: "user",
      targetId: target._id,
      metadata: { invitationSent },
      request
    });

    return ok({ invitationSent, setupExpiresAt: setup.expiresAt.toISOString() });
  } catch (error) {
    return handleApiError(error, request);
  }
}
