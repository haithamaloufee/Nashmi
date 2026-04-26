import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ChatMessageSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sourceLawIds: [{ type: Schema.Types.ObjectId, ref: "Law" }],
    safetyFlags: [{ type: String }],
    tokensUsed: { type: Number, default: null },
    model: { type: String, default: null },
    retentionUntil: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ userId: 1, createdAt: -1 });

export type ChatMessageDocument = InferSchemaType<typeof ChatMessageSchema>;
export default (models.ChatMessage as Model<ChatMessageDocument>) || model<ChatMessageDocument>("ChatMessage", ChatMessageSchema);
