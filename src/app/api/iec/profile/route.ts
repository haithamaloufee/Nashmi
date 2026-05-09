import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { authorityLogoUpdateSchema } from "@/lib/validators";
import { readJson, serialize } from "@/lib/routeUtils";
import { writeAuditLog } from "@/lib/audit";
import AuthorityProfile from "@/models/AuthorityProfile";

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
    const existing = await AuthorityProfile.findOne({ slug: "independent-election-commission" });
    if (!existing) throw new Error("NOT_FOUND");
    if (changed(input.logoUrl, existing.logoUrl) && !isUploadedProfileImageUrl(input.logoUrl)) {
      return fail("BAD_REQUEST", "ارفع شعار الهيئة من الجهاز بدلا من إدخال رابط صورة خارجي.", 400);
    }
    if (changed(input.coverUrl, existing.coverUrl) && !isUploadedProfileImageUrl(input.coverUrl)) {
      return fail("BAD_REQUEST", "ارفع غلاف الهيئة من الجهاز بدلا من إدخال رابط صورة خارجي.", 400);
    }
    const authority = await AuthorityProfile.findByIdAndUpdate(existing._id, { $set: input }, { new: true }).lean();
    await writeAuditLog({ actorUserId: user.id, actorRole: user.role, action: "iec.profile_update", targetType: "authority", targetId: existing._id, request });
    return ok({ authority: serialize(authority) });
  } catch (error) {
    return handleApiError(error);
  }
}
