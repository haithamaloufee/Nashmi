import path from "path";
import { getMaxUploadSizeBytes } from "@/lib/env";

type AllowedUpload = {
  extensions: string[];
  kind: "image" | "video";
};

export const allowedUploads: Record<string, AllowedUpload> = {
  "image/jpeg": { extensions: ["jpg", "jpeg"], kind: "image" },
  "image/png": { extensions: ["png"], kind: "image" },
  "image/webp": { extensions: ["webp"], kind: "image" },
  "image/gif": { extensions: ["gif"], kind: "image" },
  "image/avif": { extensions: ["avif"], kind: "image" },
  "image/heic": { extensions: ["heic"], kind: "image" },
  "image/heif": { extensions: ["heif"], kind: "image" },
  "video/mp4": { extensions: ["mp4"], kind: "video" },
  "video/webm": { extensions: ["webm"], kind: "video" }
};

const blockedExtensions = new Set([
  "bat",
  "cmd",
  "com",
  "dll",
  "exe",
  "html",
  "js",
  "mjs",
  "msi",
  "php",
  "ps1",
  "sh",
  "svg",
  "vbs"
]);

function originalExtension(fileName: string) {
  const originalName = path.basename((fileName || "").split(/[\\/]/).pop() || "");
  return path.extname(originalName).slice(1).toLowerCase();
}

function hasFtypBrand(buffer: Buffer, brands: string[]) {
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brandText = buffer.subarray(8, Math.min(buffer.length, 32)).toString("ascii");
  return brands.some((brand) => brandText.includes(brand));
}

export function hasValidUploadMagic(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mimeType === "image/png") return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/gif") return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/avif") return hasFtypBrand(buffer, ["avif", "avis"]);
  if (mimeType === "image/heic" || mimeType === "image/heif") return hasFtypBrand(buffer, ["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
  if (mimeType === "video/mp4") return hasFtypBrand(buffer, ["isom", "iso2", "mp41", "mp42", "avc1", "M4V"]);
  if (mimeType === "video/webm") return buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
  return false;
}

export function extensionForMimeType(mimeType: string) {
  return allowedUploads[mimeType]?.extensions[0] || "bin";
}

export function assetTypeForMimeType(mimeType: string) {
  return allowedUploads[mimeType]?.kind || "image";
}

export function validateUploadFile(file: File, options: { imagesOnly?: boolean } = {}) {
  const mimeType = file.type.toLowerCase();
  const allowed = allowedUploads[mimeType];
  if (!allowed || (options.imagesOnly && allowed.kind !== "image")) {
    return options.imagesOnly
      ? "الصيغ المسموحة للصور: JPG أو JPEG أو PNG أو WEBP أو GIF أو AVIF أو HEIC/HEIF. ملفات SVG والملفات التنفيذية غير مسموحة."
      : "الصيغ المسموحة: صور JPG أو PNG أو WEBP أو GIF أو AVIF أو HEIC/HEIF، أو فيديو MP4/WEBM. ملفات SVG والملفات التنفيذية غير مسموحة.";
  }

  const extension = originalExtension(file.name);
  if (!extension || blockedExtensions.has(extension) || !allowed.extensions.includes(extension)) {
    return "امتداد الملف غير مسموح أو لا يطابق نوع الملف المعلن.";
  }

  if (file.size <= 0) return "الملف فارغ.";

  const maxSizeBytes = getMaxUploadSizeBytes();
  if (file.size > maxSizeBytes) {
    return `حجم الملف يتجاوز الحد الأقصى المسموح (${Math.floor(maxSizeBytes / 1024 / 1024)}MB).`;
  }

  return null;
}
