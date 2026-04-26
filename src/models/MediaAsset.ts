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
    type: { type: String, enum: ["image", "document"], default: "image" },
    status: { type: String, enum: ["active", "deleted"], default: "active" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MediaAssetSchema.index({ ownerUserId: 1, createdAt: -1 });
MediaAssetSchema.index({ status: 1, createdAt: -1 });

export type MediaAssetDocument = InferSchemaType<typeof MediaAssetSchema>;
export default (models.MediaAsset as Model<MediaAssetDocument>) || model<MediaAssetDocument>("MediaAsset", MediaAssetSchema);
