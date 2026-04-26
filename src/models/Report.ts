import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportSchema = new Schema(
  {
    targetType: { type: String, enum: ["post", "poll", "comment", "party"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reporterUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: ["spam", "abuse", "misinformation", "hate", "other"], required: true },
    details: { type: String, default: null },
    status: { type: String, enum: ["open", "reviewed", "dismissed", "action_taken"], default: "open" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });

export type ReportDocument = InferSchemaType<typeof ReportSchema>;
export default (models.Report as Model<ReportDocument>) || model<ReportDocument>("Report", ReportSchema);
