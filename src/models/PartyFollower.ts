import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PartyFollowerSchema = new Schema(
  {
    partyId: { type: Schema.Types.ObjectId, ref: "Party", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PartyFollowerSchema.index({ partyId: 1, userId: 1 }, { unique: true });
PartyFollowerSchema.index({ userId: 1, createdAt: -1 });

export type PartyFollowerDocument = InferSchemaType<typeof PartyFollowerSchema>;
export default (models.PartyFollower as Model<PartyFollowerDocument>) || model<PartyFollowerDocument>("PartyFollower", PartyFollowerSchema);
