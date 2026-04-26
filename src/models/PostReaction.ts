import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PostReactionSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "dislike"], required: true }
  },
  { timestamps: true }
);

PostReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
PostReactionSchema.index({ userId: 1, createdAt: -1 });

export type PostReactionDocument = InferSchemaType<typeof PostReactionSchema>;
export default (models.PostReaction as Model<PostReactionDocument>) || model<PostReactionDocument>("PostReaction", PostReactionSchema);
