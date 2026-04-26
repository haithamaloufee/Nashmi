import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const LawSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, required: true },
    sourceName: { type: String, required: true },
    sourceType: { type: String, required: true },
    articleNumber: { type: String, default: null },
    officialReferenceUrl: { type: String, default: null },
    originalText: { type: String, default: null },
    shortDescription: { type: String, required: true },
    simplifiedExplanation: { type: String, required: true },
    practicalExample: { type: String, default: null },
    youtubeVideoId: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    tags: [{ type: String }],
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["published", "draft", "hidden"], default: "published" },
    viewsCount: { type: Number, default: 0 },
    askedChatbotCount: { type: Number, default: 0 },
    searchNormalized: { type: String, default: "" }
  },
  { timestamps: true }
);

LawSchema.index({ slug: 1 }, { unique: true });
LawSchema.index({ status: 1, category: 1, createdAt: -1 });
LawSchema.index({ searchNormalized: 1 });
LawSchema.index({ title: "text", shortDescription: "text", simplifiedExplanation: "text", originalText: "text", tags: "text" });

export type LawDocument = InferSchemaType<typeof LawSchema>;
export default (models.Law as Model<LawDocument>) || model<LawDocument>("Law", LawSchema);
