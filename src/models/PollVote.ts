import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PollVoteSchema = new Schema(
  {
    pollId: { type: Schema.Types.ObjectId, ref: "Poll", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    optionId: { type: Schema.Types.ObjectId, required: true }
  },
  { timestamps: true }
);

PollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
PollVoteSchema.index({ pollId: 1, optionId: 1 });

export type PollVoteDocument = InferSchemaType<typeof PollVoteSchema>;
export default (models.PollVote as Model<PollVoteDocument>) || model<PollVoteDocument>("PollVote", PollVoteSchema);
