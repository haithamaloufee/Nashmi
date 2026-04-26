import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const LawVersionSchema = new Schema(
  {
    lawId: { type: Schema.Types.ObjectId, ref: "Law", required: true },
    title: { type: String, required: true },
    originalText: { type: String, default: null },
    simplifiedExplanation: { type: String, required: true },
    changedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changeReason: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LawVersionSchema.index({ lawId: 1, createdAt: -1 });

export type LawVersionDocument = InferSchemaType<typeof LawVersionSchema>;
export default (models.LawVersion as Model<LawVersionDocument>) || model<LawVersionDocument>("LawVersion", LawVersionSchema);
