import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const NewsRefreshReplaySchema = new Schema(
  {
    signatureHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NewsRefreshReplaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type NewsRefreshReplayDocument = InferSchemaType<typeof NewsRefreshReplaySchema>;
export default (models.NewsRefreshReplay as Model<NewsRefreshReplayDocument>) || model<NewsRefreshReplayDocument>("NewsRefreshReplay", NewsRefreshReplaySchema);
