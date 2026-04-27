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
    officialRegistry: {
      registryUrl: { type: String, default: null },
      nationalNumber: { type: String, default: null },
      secretaryGeneral: { type: String, default: null },
      mainHeadquarters: { type: String, default: null },
      foundingOrConferenceDate: { type: Date, default: null },
      mergerDate: { type: Date, default: null },
      sourceName: { type: String, default: null },
      sourceCheckedAt: { type: Date, default: null }
    },
    contact: {
      phones: [{ type: String }],
      email: { type: String, default: null },
      website: { type: String, default: null },
      headquarters: { type: String, default: null },
      branches: [{ type: String }]
    },
    statistics: {
      membersCount: { type: Number, default: null },
      womenMembersCount: { type: Number, default: null },
      youthMembersCount: { type: Number, default: null },
      menMembersCount: { type: Number, default: null },
      branchesCount: { type: Number, default: null },
      statisticsNote: { type: String, default: null }
    },
    committees: [
      {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: null },
        members: [{ type: String }],
        contact: { type: String, default: null }
      }
    ],
    latestAchievements: [
      {
        title: { type: String, required: true, trim: true },
        date: { type: Date, default: null },
        description: { type: String, default: null },
        sourceUrl: { type: String, default: null }
      }
    ],
    dataQuality: {
      registryDataVerified: { type: Boolean, default: false },
      officialWebsiteVerified: { type: Boolean, default: false },
      socialLinksNeedManualVerification: { type: Boolean, default: true },
      statisticsNeedManualVerification: { type: Boolean, default: true },
      imagesDeferred: { type: Boolean, default: true },
      notes: { type: String, default: null }
    },
    contactEmail: { type: String, default: null },
    accountUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followersCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    pollsCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "disabled", "draft", "archived"], default: "active" },
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
