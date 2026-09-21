import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MediaAssetSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    bucket: { type: String, default: null },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, default: null },
    etag: { type: String, default: null },
    originalFileName: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    type: { type: String, enum: ["image", "video", "document"], default: "image" },
    purpose: { type: String, enum: ["post", "avatar", "party_logo", "party_cover", "authority_logo", "authority_cover", "law_thumbnail", "misc"], default: "misc" },
    resourceType: { type: String, enum: ["avatar", "party", "post", "survey", "update", "document", "misc"], default: "misc" },
    visibility: { type: String, enum: ["public", "protected"], default: "public" },
    provider: { type: String, enum: ["cloudflare_r2", "vercel_blob", "local_dev"], default: "cloudflare_r2" },
    status: { type: String, enum: ["pending", "ready", "active", "deleting", "failed", "deleted"], default: "pending" },
    uploadExpiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    sourceProvider: { type: String, enum: ["vercel_blob", "local_dev"], default: null },
    sourceUrl: { type: String, default: null },
    sourceStorageKey: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MediaAssetSchema.index({ ownerUserId: 1, createdAt: -1 });
MediaAssetSchema.index({ status: 1, createdAt: -1 });
MediaAssetSchema.index({ ownerUserId: 1, storageKey: 1 }, { unique: true });
MediaAssetSchema.index({ provider: 1, status: 1 });
MediaAssetSchema.index({ uploadExpiresAt: 1 }, { partialFilterExpression: { status: "pending" } });
MediaAssetSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true });

export type MediaAssetDocument = InferSchemaType<typeof MediaAssetSchema>;
export default (models.MediaAsset as Model<MediaAssetDocument>) || model<MediaAssetDocument>("MediaAsset", MediaAssetSchema);
