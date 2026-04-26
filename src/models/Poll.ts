import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PollOptionSchema = new Schema(
  {
    text: { type: String, required: true },
    votesCount: { type: Number, default: 0 }
  },
  { _id: true }
);

const PollSchema = new Schema(
  {
    authorType: { type: String, enum: ["party", "iec", "admin"], required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partyId: { type: Schema.Types.ObjectId, ref: "Party", default: null },
    question: { type: String, required: true },
    description: { type: String, default: null },
    options: { type: [PollOptionSchema], required: true },
    pollType: { type: String, enum: ["single_choice"], default: "single_choice" },
    allowedVoterRoles: { type: [String], enum: ["citizen"], default: ["citizen"] },
    resultsVisibility: { type: String, enum: ["always", "after_vote", "after_close"], default: "always" },
    allowVoteChange: { type: Boolean, default: false },
    optionsLockedAt: { type: Date, default: null },
    totalVotes: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ["active", "closed", "hidden", "deleted"], default: "active" },
    publishedAt: { type: Date, default: Date.now },
    searchNormalized: { type: String, default: "" }
  },
  { timestamps: true }
);

PollSchema.index({ status: 1, publishedAt: -1 });
PollSchema.index({ partyId: 1, status: 1, publishedAt: -1 });
PollSchema.index({ authorUserId: 1, createdAt: -1 });
PollSchema.index({ searchNormalized: 1 });
PollSchema.index({ question: "text", description: "text" });

export type PollDocument = InferSchemaType<typeof PollSchema>;
export default (models.Poll as Model<PollDocument>) || model<PollDocument>("Poll", PollSchema);
