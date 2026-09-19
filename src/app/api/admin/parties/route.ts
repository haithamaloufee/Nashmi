import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { partySchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { normalizeEmail } from "@/lib/security";
import { readJson, isDuplicateKeyError, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Party from "@/models/Party";
import User from "@/models/User";
import { buildAccountSetupUrl, createAccountSetup } from "@/lib/accountSetup";

export async function GET() {
  try {
    await requireActiveUser(["admin", "super_admin"]);
    await connectToDatabase();
    const parties = await Party.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return ok({ parties: serialize(parties) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActiveUser(["admin", "super_admin"]);
    const input = await readJson(request, partySchema);
    await connectToDatabase();

    let accountUserId = null;
    let accountSetup: ReturnType<typeof createAccountSetup> | null = null;
    if (input.createAccount) {
      if (!input.accountEmail) return fail("BAD_REQUEST", "بريد حساب الحزب مطلوب", 400);
      accountSetup = createAccountSetup();
      const account = await User.create({
        name: input.name,
        email: input.accountEmail,
        emailNormalized: normalizeEmail(input.accountEmail),
        emailVerified: false,
        passwordHash: null,
        passwordSetupTokenHash: accountSetup.tokenHash,
        passwordSetupExpiresAt: accountSetup.expiresAt,
        passwordSetupTargetStatus: "active",
        role: "party",
        provider: "credentials",
        status: "pending",
        language: "ar"
      });
      accountUserId = account._id;
    }

    const party = await Party.create({
      ...input,
      contactEmail: input.contactEmail || null,
      foundedYear: input.foundedYear || null,
      accountUserId,
      createdByAdminId: actor.id,
      searchNormalized: createSearchText([input.name, input.shortDescription, input.description, input.vision, ...(input.goals || [])])
    });

    await writeAuditLog({ actorUserId: actor.id, actorRole: actor.role, action: "admin.party_create", targetType: "party", targetId: party._id, metadata: { accountCreated: Boolean(accountUserId) }, request });
    return ok({
      party: serialize(party),
      setupUrl: accountSetup ? buildAccountSetupUrl(accountSetup.token) : null,
      setupExpiresAt: accountSetup?.expiresAt.toISOString() || null
    }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) return fail("CONFLICT", "يوجد حزب أو حساب بنفس البيانات", 409);
    return handleApiError(error);
  }
}
