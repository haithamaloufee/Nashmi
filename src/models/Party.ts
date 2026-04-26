import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PartySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    logoMediaId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    coverMediaId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    foundedYear: { type: Number, default: null },
    vision: { type: String, required: true },
    goals: [{ type: String }],
    socialLinks: { type: Schema.Types.Mixed, default: {} },
    contactEmail: { type: String, default: null },
    accountUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followersCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    pollsCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "disabled", "draft"], default: "active" },
    isVerified: { type: Boolean, default: false },
    searchNormalized: { type: String, default: "" }
  },
  { timestamps: true }
);

PartySchema.index({ slug: 1 }, { unique: true });
PartySchema.index({ accountUserId: 1 }, { unique: true, partialFilterExpression: { accountUserId: { $exists: true, $ne: null } } });
PartySchema.index({ name: "text", shortDescription: "text", description: "text" });
PartySchema.index({ searchNormalized: 1 });
PartySchema.index({ status: 1, isVerified: 1 });

export type PartyDocument = InferSchemaType<typeof PartySchema>;
export default (models.Party as Model<PartyDocument>) || model<PartyDocument>("Party", PartySchema);
