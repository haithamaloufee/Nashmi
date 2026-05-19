import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SiteContentSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    titleEn: { type: String, required: true, trim: true },
    bodyAr: { type: String, required: true, trim: true },
    bodyEn: { type: String, required: true, trim: true },
    youtubeUrl: { type: String, default: null },
    youtubeVideoId: { type: String, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

SiteContentSchema.index({ key: 1 }, { unique: true });

export type SiteContentDocument = InferSchemaType<typeof SiteContentSchema>;
export default (models.SiteContent as Model<SiteContentDocument>) || model<SiteContentDocument>("SiteContent", SiteContentSchema);
