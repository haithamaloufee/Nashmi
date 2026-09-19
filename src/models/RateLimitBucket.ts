import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const RateLimitBucketSchema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
    resetAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true, _id: false }
);

RateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitBucketDocument = InferSchemaType<typeof RateLimitBucketSchema>;
export default (models.RateLimitBucket as Model<RateLimitBucketDocument>) || model<RateLimitBucketDocument>("RateLimitBucket", RateLimitBucketSchema);
