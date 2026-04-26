import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PollReactionSchema = new Schema(
  {
    pollId: { type: Schema.Types.ObjectId, ref: "Poll", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "dislike"], required: true }
  },
  { timestamps: true }
);

PollReactionSchema.index({ pollId: 1, userId: 1 }, { unique: true });
PollReactionSchema.index({ userId: 1, createdAt: -1 });

export type PollReactionDocument = InferSchemaType<typeof PollReactionSchema>;
export default (models.PollReaction as Model<PollReactionDocument>) || model<PollReactionDocument>("PollReaction", PollReactionSchema);
