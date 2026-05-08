import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser, safeUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import { extensionForMimeType, hasValidUploadMagic, validateUploadFile } from "@/lib/uploadValidation";
import { storePublicFile } from "@/lib/storage";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`avatar:${user.id}`, 10, 60 * 60 * 1000);

    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return fail("BAD_REQUEST", "الصورة مطلوبة", 400);

    const validationError = validateUploadFile(file, { imagesOnly: true });
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const mimeType = file.type.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidUploadMagic(buffer, mimeType)) return fail("BAD_REQUEST", "نوع الصورة لا يطابق محتواها", 400);

    const storageKey = `avatars/${user.id}/${randomUUID()}.${extensionForMimeType(mimeType)}`;
    const stored = await storePublicFile({ buffer, storageKey, contentType: mimeType });

    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: stored.url } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: null } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
