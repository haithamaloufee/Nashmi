import { mkdir, open } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db";
import { getMaxUploadSizeBytes } from "@/lib/env";
import { ok, fail, handleApiError } from "@/lib/apiResponse";
import { requireActiveUser } from "@/lib/auth";
import { requireRateLimit } from "@/lib/rateLimit";
import { serialize } from "@/lib/routeUtils";
import MediaAsset from "@/models/MediaAsset";

export const runtime = "nodejs";

const allowedTypes: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"]
};

const executableExtensions = new Set([
  "bat",
  "cmd",
  "com",
  "dll",
  "exe",
  "js",
  "msi",
  "php",
  "ps1",
  "sh",
  "svg",
  "vbs"
]);

function hasValidMagic(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mimeType === "image/png") return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "video/mp4") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (mimeType === "video/webm") return buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
  return false;
}

function validateUploadedFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extensions = allowedTypes[mimeType];
  if (!extensions) {
    return "الملفات المسموحة: صور jpg, jpeg, png, webp أو فيديو mp4, webm. SVG والملفات التنفيذية غير مسموحة.";
  }

  const originalName = path.basename((file.name || "").split(/[\\/]/).pop() || "");
  const extension = path.extname(originalName).slice(1).toLowerCase();
  if (!extension || executableExtensions.has(extension) || !extensions.includes(extension)) {
    return "امتداد الملف غير مسموح أو لا يطابق نوع الصورة.";
  }

  if (file.size <= 0) return "الملف فارغ.";

  const maxSizeBytes = getMaxUploadSizeBytes();
  if (file.size > maxSizeBytes) {
    return `الحد الأقصى لحجم الصورة ${Math.floor(maxSizeBytes / 1024 / 1024)}MB`;
  }

  return null;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  return "jpg";
}

function assetTypeForMimeType(mimeType: string) {
  return mimeType.startsWith("video/") ? "video" : "image";
}

function safeUploadPath(uploadDir: string, storageKey: string) {
  const resolvedDir = path.resolve(uploadDir);
  const resolvedPath = path.resolve(resolvedDir, storageKey);
  if (!resolvedPath.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error("BAD_REQUEST");
  }
  return resolvedPath;
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser(["citizen", "party", "iec", "admin", "super_admin"]);
    requireRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("BAD_REQUEST", "الملف مطلوب", 400);

    const validationError = validateUploadedFile(file);
    if (validationError) return fail("BAD_REQUEST", validationError, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidMagic(buffer, file.type.toLowerCase())) return fail("BAD_REQUEST", "نوع الملف لا يطابق محتواه", 400);

    await connectToDatabase();
    const storageKey = `${randomUUID()}.${extensionForMimeType(file.type.toLowerCase())}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const fileHandle = await open(safeUploadPath(uploadDir, storageKey), "wx");
    try {
      await fileHandle.writeFile(buffer);
    } finally {
      await fileHandle.close();
    }

    const asset = await MediaAsset.create({
      ownerUserId: user.id,
      url: `/uploads/${storageKey}`,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      width: null,
      height: null,
      type: assetTypeForMimeType(file.type.toLowerCase()),
      status: "active"
    });
    return ok({ asset: serialize(asset) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
