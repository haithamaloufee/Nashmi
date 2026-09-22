import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LEGISLATIVE_STAGES, NEWS_CATEGORIES } from "@/lib/news/types";

const NewsContextSchema = new Schema(
  {
    newsId: { type: String, required: true },
    titleAr: { type: String, required: true },
    summaryAr: { type: String, required: true },
    category: { type: String, enum: NEWS_CATEGORIES, required: true },
    urgency: { type: String, enum: ["normal", "breaking"], required: true },
    publishedAt: { type: Date, required: true },
    legislativeStage: { type: String, enum: [...LEGISLATIVE_STAGES, null], default: null },
    sources: [{
      _id: false,
      title: { type: String, required: true },
      url: { type: String, required: true },
      publisher: { type: String, required: true },
      sourceClass: { type: String, enum: ["official", "news_agency", "reputable_media"], required: true }
    }]
  },
  { _id: false }
);

const ChatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: null },
    status: { type: String, enum: ["active", "archived", "deleted"], default: "active" },
    summary: { type: String, default: null },
    provider: { type: String, default: "gemini" },
    model: { type: String, default: null },
    newsContext: { type: NewsContextSchema, default: null, immutable: true }
  },
  { timestamps: true }
);

ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatSessionSchema.index({ userId: 1, createdAt: -1 });

export type ChatSessionDocument = InferSchemaType<typeof ChatSessionSchema>;
export default (models.ChatSession as Model<ChatSessionDocument>) || model<ChatSessionDocument>("ChatSession", ChatSessionSchema);
