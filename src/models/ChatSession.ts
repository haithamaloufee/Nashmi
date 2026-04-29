import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ChatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: null },
    status: { type: String, enum: ["active", "archived", "deleted"], default: "active" },
    summary: { type: String, default: null },
    provider: { type: String, default: "gemini" },
    model: { type: String, default: null }
  },
  { timestamps: true }
);

ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatSessionSchema.index({ userId: 1, createdAt: -1 });

export type ChatSessionDocument = InferSchemaType<typeof ChatSessionSchema>;
export default (models.ChatSession as Model<ChatSessionDocument>) || model<ChatSessionDocument>("ChatSession", ChatSessionSchema);
