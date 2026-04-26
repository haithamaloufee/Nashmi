import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ModerationActionSchema = new Schema(
  {
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: ["hide", "delete", "restore", "dismiss_report"], required: true },
    reason: { type: String, required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ModerationActionSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ModerationActionSchema.index({ actorUserId: 1, createdAt: -1 });

export type ModerationActionDocument = InferSchemaType<typeof ModerationActionSchema>;
export default (models.ModerationAction as Model<ModerationActionDocument>) || model<ModerationActionDocument>("ModerationAction", ModerationActionSchema);
