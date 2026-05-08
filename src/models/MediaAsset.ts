import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MediaAssetSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    type: { type: String, enum: ["image", "video", "document"], default: "image" },
    purpose: { type: String, enum: ["post", "avatar", "party_logo", "party_cover", "authority_logo", "authority_cover", "law_thumbnail", "misc"], default: "misc" },
    provider: { type: String, enum: ["vercel_blob", "local_dev"], default: "vercel_blob" },
    status: { type: String, enum: ["pending", "active", "deleted"], default: "active" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MediaAssetSchema.index({ ownerUserId: 1, createdAt: -1 });
MediaAssetSchema.index({ status: 1, createdAt: -1 });
MediaAssetSchema.index({ ownerUserId: 1, storageKey: 1 }, { unique: true });

export type MediaAssetDocument = InferSchemaType<typeof MediaAssetSchema>;
export default (models.MediaAsset as Model<MediaAssetDocument>) || model<MediaAssetDocument>("MediaAsset", MediaAssetSchema);
