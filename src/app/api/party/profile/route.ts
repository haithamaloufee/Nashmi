import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { partyProfileUpdateSchema } from "@/lib/validators";
import { createSearchText } from "@/lib/arabicSearch";
import { readJson, requirePartyForUser, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import Party from "@/models/Party";
import User from "@/models/User";

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

function hostnameOnly(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("/")) return "local";
  try {
    return new URL(value).hostname;
  } catch {
    return "invalid";
  }
}

function revalidatePartyProfilePaths(slug?: string | null) {
  const paths = ["/", "/updates", "/parties", "/party-dashboard", "/party-dashboard/profile"];
  if (slug) paths.push(`/parties/${slug}`);
  const failures: string[] = [];
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      failures.push(path);
    }
  }
  return failures;
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
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") || randomUUID();
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
    if (changed(input.logoUrl, party.logoUrl)) {
      await User.updateOne({ _id: user.id }, { $set: { avatarUrl: input.logoUrl || null } });
    }
    const revalidationFailures = revalidatePartyProfilePaths(updated?.slug || party.slug);
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "party.profile_update", targetType: "party", targetId: party._id, request });
    console.info({
      requestId,
      route: "/api/party/profile",
      userId: user.id,
      userRole: user.role,
      targetPartyId: String(party._id),
      updatedFields: Object.keys(update),
      oldImageExisted: Boolean(party.logoUrl),
      newImageHostname: hostnameOnly(input.logoUrl),
      dbUpdateSuccess: Boolean(updated),
      revalidationSuccess: revalidationFailures.length === 0,
      revalidationFailures,
      durationMs: Date.now() - startedAt
    });
    return ok({ party: serialize(updated) });
  } catch (error) {
    console.error({
      requestId,
      route: "/api/party/profile",
      dbUpdateSuccess: false,
      durationMs: Date.now() - startedAt
    });
    return handleApiError(error);
  }
}
