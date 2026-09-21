import "server-only";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import {
  getDailyUploadQuotaBytes,
  getPublisherMediaQuotaBytes,
  getR2BucketName,
  getR2EnvironmentPrefix,
  getR2UploadExpirySeconds,
  getUserMediaQuotaBytes
} from "@/lib/env";
import { getObjectStorage } from "@/lib/storage/index";
import {
  assetTypeForMimeType,
  extensionForMimeType,
  hasValidUploadMagic,
  validateUploadMetadata
} from "@/lib/uploadValidation";
import MediaAsset from "@/models/MediaAsset";

export const mediaPurposes = [
  "post",
  "avatar",
  "party_logo",
  "party_cover",
  "authority_logo",
  "authority_cover",
  "law_thumbnail",
  "misc"
] as const;

export type MediaPurpose = (typeof mediaPurposes)[number];

type UploadingUser = { id: string; role: string };

const imagesOnlyPurposes = new Set<MediaPurpose>([
  "avatar",
  "party_logo",
  "party_cover",
  "authority_logo",
  "authority_cover",
  "law_thumbnail"
]);

function purposeConfig(purpose: MediaPurpose) {
  if (purpose === "avatar") return { category: "avatars", resourceType: "avatar", visibility: "public" } as const;
  if (purpose === "party_logo" || purpose === "party_cover") return { category: "parties", resourceType: "party", visibility: "public" } as const;
  if (purpose === "authority_logo" || purpose === "authority_cover") return { category: "updates", resourceType: "update", visibility: "public" } as const;
  if (purpose === "law_thumbnail") return { category: "documents", resourceType: "document", visibility: "public" } as const;
  if (purpose === "post") return { category: "posts", resourceType: "post", visibility: "public" } as const;
  return { category: "documents", resourceType: "misc", visibility: "protected" } as const;
}

export function parseMediaPurpose(value: unknown): MediaPurpose | null {
  return typeof value === "string" && mediaPurposes.includes(value as MediaPurpose) ? value as MediaPurpose : null;
}

export function stableMediaUrl(assetId: string, storageKey: string, visibility: "public" | "protected") {
  const direct = visibility === "public" ? getObjectStorage().getPublicUrl(storageKey) : null;
  return direct || `/api/media/${assetId}`;
}

async function enforceQuota(user: UploadingUser, requestedBytes: number) {
  const totalLimit = ["party", "iec", "admin", "super_admin"].includes(user.role)
    ? getPublisherMediaQuotaBytes()
    : getUserMediaQuotaBytes();
  const activeStates = ["pending", "ready", "active"];
  const [totals] = await MediaAsset.aggregate([
    { $match: { ownerUserId: new Types.ObjectId(user.id), status: { $in: activeStates } } },
    {
      $group: {
        _id: null,
        totalBytes: { $sum: "$sizeBytes" },
        dailyBytes: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", new Date(Date.now() - 24 * 60 * 60 * 1000)] }, "$sizeBytes", 0]
          }
        }
      }
    }
  ]);
  const totalBytes = Number(totals?.totalBytes) || 0;
  const dailyBytes = Number(totals?.dailyBytes) || 0;
  if (totalBytes + requestedBytes > totalLimit) throw new Error("MEDIA_TOTAL_QUOTA_EXCEEDED");
  if (dailyBytes + requestedBytes > getDailyUploadQuotaBytes()) throw new Error("MEDIA_DAILY_QUOTA_EXCEEDED");
}

export async function createMediaUploadAuthorization(input: {
  user: UploadingUser;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: MediaPurpose;
}) {
  const allowedByPurpose: Record<MediaPurpose, string[]> = {
    avatar: ["citizen", "party", "iec", "admin", "super_admin"],
    post: ["party", "iec", "admin", "super_admin"],
    party_logo: ["party", "admin", "super_admin"],
    party_cover: ["party", "admin", "super_admin"],
    authority_logo: ["iec", "admin", "super_admin"],
    authority_cover: ["iec", "admin", "super_admin"],
    law_thumbnail: ["iec", "admin", "super_admin"],
    misc: ["citizen", "party", "iec", "admin", "super_admin"]
  };
  if (!allowedByPurpose[input.purpose].includes(input.user.role)) throw new Error("FORBIDDEN");
  const mimeType = input.mimeType.toLowerCase();
  const validationError = validateUploadMetadata({
    fileName: input.fileName,
    mimeType,
    size: input.sizeBytes,
    imagesOnly: imagesOnlyPurposes.has(input.purpose)
  });
  if (validationError) throw new Error(`UPLOAD_VALIDATION:${validationError}`);

  await connectToDatabase();
  await enforceQuota(input.user, input.sizeBytes);
  const config = purposeConfig(input.purpose);
  const storageKey = `${getR2EnvironmentPrefix()}/${config.category}/${input.user.id}/${randomUUID()}.${extensionForMimeType(mimeType)}`;
  const expiresInSeconds = getR2UploadExpirySeconds();
  const asset = await MediaAsset.create({
    ownerUserId: input.user.id,
    url: "pending",
    bucket: getR2BucketName(),
    storageKey,
    mimeType,
    sizeBytes: input.sizeBytes,
    originalFileName: input.fileName.slice(0, 255),
    type: assetTypeForMimeType(mimeType),
    purpose: input.purpose,
    resourceType: config.resourceType,
    visibility: config.visibility,
    provider: "cloudflare_r2",
    status: "pending",
    uploadExpiresAt: new Date(Date.now() + expiresInSeconds * 1000)
  });

  try {
    const authorization = await getObjectStorage().createUploadAuthorization({
      storageKey,
      contentType: mimeType,
      sizeBytes: input.sizeBytes,
      expiresInSeconds
    });
    return { assetId: String(asset._id), authorization };
  } catch (error) {
    await MediaAsset.updateOne({ _id: asset._id, status: "pending" }, { $set: { status: "failed", failureReason: "authorization_failed" } });
    throw error;
  }
}

export async function confirmMediaUpload(input: { user: UploadingUser; assetId: string }) {
  await connectToDatabase();
  const asset = await MediaAsset.findOne({ _id: input.assetId, ownerUserId: input.user.id }).lean();
  if (!asset) throw new Error("MEDIA_NOT_FOUND");
  if (asset.status === "ready" || asset.status === "active") return asset;
  if (asset.status !== "pending") throw new Error("MEDIA_NOT_PENDING");
  if (asset.uploadExpiresAt && new Date(asset.uploadExpiresAt).getTime() + 10 * 60 * 1000 < Date.now()) {
    await getObjectStorage().deleteObject(asset.storageKey).catch(() => undefined);
    await MediaAsset.updateOne({ _id: asset._id, status: "pending" }, { $set: { status: "failed", failureReason: "upload_expired" } });
    throw new Error("MEDIA_UPLOAD_EXPIRED");
  }

  const storage = getObjectStorage();
  const metadata = await storage.getObjectMetadata(asset.storageKey);
  if (!metadata.exists || metadata.contentLength !== asset.sizeBytes || metadata.contentType !== asset.mimeType.toLowerCase()) {
    if (metadata.exists) await storage.deleteObject(asset.storageKey).catch(() => undefined);
    await MediaAsset.updateOne(
      { _id: asset._id, status: "pending" },
      { $set: { status: "failed", failureReason: !metadata.exists ? "object_missing" : "metadata_mismatch" } }
    );
    throw new Error(!metadata.exists ? "MEDIA_OBJECT_MISSING" : "MEDIA_METADATA_MISMATCH");
  }
  const magic = await storage.readObjectPrefix(asset.storageKey, 64);
  if (!magic || !hasValidUploadMagic(magic, asset.mimeType)) {
    await storage.deleteObject(asset.storageKey).catch(() => undefined);
    await MediaAsset.updateOne({ _id: asset._id, status: "pending" }, { $set: { status: "failed", failureReason: "magic_mismatch" } });
    throw new Error("MEDIA_MAGIC_MISMATCH");
  }

  const url = stableMediaUrl(String(asset._id), asset.storageKey, asset.visibility === "protected" ? "protected" : "public");
  const updated = await MediaAsset.findOneAndUpdate(
    { _id: asset._id, ownerUserId: input.user.id, status: "pending" },
    {
      $set: {
        url,
        status: "ready",
        etag: metadata.etag,
        sha256: metadata.sha256,
        completedAt: new Date(),
        uploadExpiresAt: null,
        failureReason: null
      }
    },
    { new: true }
  ).lean();
  if (!updated) throw new Error("MEDIA_CONFIRMATION_RACE");
  return updated;
}
