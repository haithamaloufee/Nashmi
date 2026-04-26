import bcrypt from "bcryptjs";
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
    let generatedPassword: string | null = null;
    if (input.createAccount) {
      if (!input.accountEmail) return fail("BAD_REQUEST", "بريد حساب الحزب مطلوب", 400);
      generatedPassword = "Password123!";
      const account = await User.create({
        name: input.name,
        email: input.accountEmail,
        emailNormalized: normalizeEmail(input.accountEmail),
        emailVerified: true,
        passwordHash: await bcrypt.hash(generatedPassword, 12),
        role: "party",
        provider: "credentials",
        status: "active",
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
    return ok({ party: serialize(party), generatedPassword }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) return fail("CONFLICT", "يوجد حزب أو حساب بنفس البيانات", 409);
    return handleApiError(error);
  }
}
