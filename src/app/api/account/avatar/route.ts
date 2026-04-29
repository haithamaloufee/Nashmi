import { mkdir, open } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db";
import { getMaxUploadSizeBytes } from "@/lib/env";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser, safeUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";

export const runtime = "nodejs";

const allowedTypes: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"]
};

const blockedExtensions = new Set(["bat", "cmd", "com", "dll", "exe", "js", "msi", "php", "ps1", "sh", "svg", "vbs"]);

function hasValidMagic(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mimeType === "image/png") return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function validateAvatar(file: File) {
  const mimeType = file.type.toLowerCase();
  const extensions = allowedTypes[mimeType];
  if (!extensions) return "الصور المسموحة فقط: jpg, jpeg, png, webp. SVG والملفات التنفيذية غير مسموحة.";

  const originalName = path.basename((file.name || "").split(/[\\/]/).pop() || "");
  const extension = path.extname(originalName).slice(1).toLowerCase();
  if (!extension || blockedExtensions.has(extension) || !extensions.includes(extension)) return "امتداد الملف غير مسموح أو لا يطابق نوع الصورة.";
  if (file.size <= 0) return "الملف فارغ.";
  if (file.size > getMaxUploadSizeBytes()) return `الحد الأقصى لحجم الصورة ${Math.floor(getMaxUploadSizeBytes() / 1024 / 1024)}MB`;
  return null;
}

function safeUploadPath(uploadDir: string, storageKey: string) {
  const resolvedDir = path.resolve(uploadDir);
  const resolvedPath = path.resolve(resolvedDir, storageKey);
  if (!resolvedPath.startsWith(`${resolvedDir}${path.sep}`)) throw new Error("BAD_REQUEST");
  return resolvedPath;
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`avatar:${user.id}`, 10, 60 * 60 * 1000);

    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return fail("BAD_REQUEST", "الصورة مطلوبة", 400);

    const validationError = validateAvatar(file);
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidMagic(buffer, file.type.toLowerCase())) return fail("BAD_REQUEST", "نوع الملف لا يطابق محتواه", 400);

    const storageKey = `${user.id}-${randomUUID()}.${extensionForMimeType(file.type.toLowerCase())}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });
    const fileHandle = await open(safeUploadPath(uploadDir, storageKey), "wx");
    try {
      await fileHandle.writeFile(buffer);
    } finally {
      await fileHandle.close();
    }

    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(user.id, { $set: { avatarUrl: `/uploads/avatars/${storageKey}` } }, { new: true });
    if (!updated) throw new Error("NOT_FOUND");
    return ok({ user: safeUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
