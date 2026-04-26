import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PostSchema = new Schema(
  {
    authorType: { type: String, enum: ["party", "iec", "admin"], required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partyId: { type: Schema.Types.ObjectId, ref: "Party", default: null },
    title: { type: String, default: null },
    content: { type: String, required: true },
    mediaIds: [{ type: Schema.Types.ObjectId, ref: "MediaAsset" }],
    tags: [{ type: String }],
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    visibility: { type: String, enum: ["public"], default: "public" },
    status: { type: String, enum: ["published", "hidden", "deleted"], default: "published" },
    publishedAt: { type: Date, default: Date.now },
    searchNormalized: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    moderationReason: { type: String, default: null }
  },
  { timestamps: true }
);

PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ partyId: 1, status: 1, publishedAt: -1 });
PostSchema.index({ authorUserId: 1, createdAt: -1 });
PostSchema.index({ searchNormalized: 1 });
PostSchema.index({ title: "text", content: "text", tags: "text" });

export type PostDocument = InferSchemaType<typeof PostSchema>;
export default (models.Post as Model<PostDocument>) || model<PostDocument>("Post", PostSchema);
