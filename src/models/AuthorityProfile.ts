import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const OfficialLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const AuthorityProfileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    establishedYear: { type: Number, default: null },
    vision: { type: String, default: null },
    mission: { type: String, default: null },
    goals: [{ type: String }],
    logoMediaId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    coverMediaId: { type: Schema.Types.ObjectId, ref: "MediaAsset", default: null },
    logoUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    contact: {
      poBox: { type: String, default: null },
      email: { type: String, default: null },
      nationalCallCenter: { type: String, default: null },
      phones: [{ type: String }],
      website: { type: String, default: null },
      partyRegistryUrl: { type: String, default: null },
      partiesPlatformUrl: { type: String, default: null },
      trainingPlatformUrl: { type: String, default: null }
    },
    socialLinks: {
      website: { type: String, default: null },
      facebook: { type: String, default: null },
      x: { type: String, default: null },
      instagram: { type: String, default: null },
      youtube: { type: String, default: null }
    },
    officialLinks: { type: [OfficialLinkSchema], default: [] },
    statistics: {
      note: { type: String, default: null }
    },
    source: {
      sourceName: { type: String, default: null },
      sourceUrl: { type: String, default: null },
      sourceCheckedAt: { type: Date, default: null }
    },
    status: { type: String, enum: ["active", "disabled", "draft"], default: "active" }
  },
  { timestamps: true }
);

AuthorityProfileSchema.index({ slug: 1 }, { unique: true });

export type AuthorityProfileDocument = InferSchemaType<typeof AuthorityProfileSchema>;
export default (models.AuthorityProfile as Model<AuthorityProfileDocument>) || model<AuthorityProfileDocument>("AuthorityProfile", AuthorityProfileSchema);
