import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AssistantUsageSchema = new Schema(
  {
    subjectType: { type: String, enum: ["guest", "user"], required: true },
    subjectKey: { type: String, required: true },
    dateKey: { type: String, required: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    count: { type: Number, default: 0, min: 0 },
    lastRequestAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

AssistantUsageSchema.index({ subjectType: 1, subjectKey: 1, dateKey: 1 }, { unique: true });
AssistantUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AssistantUsageDocument = InferSchemaType<typeof AssistantUsageSchema>;
export default (models.AssistantUsage as Model<AssistantUsageDocument>) || model<AssistantUsageDocument>("AssistantUsage", AssistantUsageSchema);
