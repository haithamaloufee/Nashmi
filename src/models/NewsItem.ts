import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LEGISLATIVE_STAGES, NEWS_CATEGORIES } from "@/lib/news/types";

const NewsSourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 240 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publisher: { type: String, required: true, trim: true, maxlength: 160 },
    sourceClass: { type: String, enum: ["official", "news_agency", "reputable_media"], required: true }
  },
  { _id: false }
);

const NewsItemSchema = new Schema(
  {
    titleAr: { type: String, required: true, trim: true, minlength: 12, maxlength: 180 },
    summaryAr: { type: String, required: true, trim: true, minlength: 30, maxlength: 900 },
    category: { type: String, enum: NEWS_CATEGORIES, required: true },
    urgency: { type: String, enum: ["normal", "breaking"], default: "normal" },
    publishedAt: { type: Date, required: true },
    legislativeStage: { type: String, enum: [...LEGISLATIVE_STAGES, null], default: null },
    sources: { type: [NewsSourceSchema], required: true, validate: [(value: unknown[]) => value.length > 0 && value.length <= 6, "sources required"] },
    canonicalHash: { type: String, required: true, unique: true },
    sourceUrlHashes: { type: [String], default: [] },
    status: { type: String, enum: ["published", "hidden"], default: "published" },
    isActive: { type: Boolean, default: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    jordanRelevance: { type: Number, min: 0, max: 1, required: true },
    discoveredAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    discoveryRunId: { type: String, required: true, maxlength: 80 }
  },
  { timestamps: true }
);

NewsItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
NewsItemSchema.index({ status: 1, isActive: 1, publishedAt: -1 });
NewsItemSchema.index({ status: 1, isActive: 1, lastSeenAt: -1 });
NewsItemSchema.index({ sourceUrlHashes: 1 });

export type NewsItemDocument = InferSchemaType<typeof NewsItemSchema>;
export default (models.NewsItem as Model<NewsItemDocument>) || model<NewsItemDocument>("NewsItem", NewsItemSchema);
