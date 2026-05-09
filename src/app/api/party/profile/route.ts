import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { partyProfileUpdateSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { readJson, requirePartyForUser, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Party from "@/models/Party";

function isUploadedProfileImageUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("/uploads/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function changed(value: unknown, existing: unknown) {
  return value !== undefined && value !== (existing || null);
}

export async function GET() {
  try {
    const user = await requireActiveUser(["party"]);
    await connectToDatabase();
    const party = await requirePartyForUser(user.id);
    return ok({ party: serialize(party) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireActiveUser(["party"]);
    const input = await readJson(request, partyProfileUpdateSchema);
    await connectToDatabase();
    const party = await requirePartyForUser(user.id);
    if (changed(input.logoUrl, party.logoUrl) && !isUploadedProfileImageUrl(input.logoUrl)) {
      return fail("BAD_REQUEST", "ارفع شعار الحزب من الجهاز بدلا من إدخال رابط صورة خارجي.", 400);
    }
    if (changed(input.coverUrl, party.coverUrl) && !isUploadedProfileImageUrl(input.coverUrl)) {
      return fail("BAD_REQUEST", "ارفع غلاف الحزب من الجهاز بدلا من إدخال رابط صورة خارجي.", 400);
    }
    const update: Record<string, unknown> = { ...input };
    update.searchNormalized = createSearchText([
      party.name,
      input.shortDescription || party.shortDescription,
      input.description || party.description,
      input.vision || party.vision,
      ...((input.goals || party.goals || []) as string[])
    ]);
    const updated = await Party.findByIdAndUpdate(party._id, { $set: update }, { new: true }).lean();
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "party.profile_update", targetType: "party", targetId: party._id, request });
    return ok({ party: serialize(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
