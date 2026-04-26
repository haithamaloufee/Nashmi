import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CommentSchema = new Schema(
  {
    targetType: { type: String, enum: ["post", "poll"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRoleSnapshot: { type: String, enum: ["citizen", "party", "iec", "admin", "super_admin"], required: true },
    partyId: { type: Schema.Types.ObjectId, ref: "Party", default: null },
    content: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["published", "hidden", "deleted"], default: "published" },
    reportsCount: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    hiddenReason: { type: String, default: null },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
CommentSchema.index({ authorUserId: 1, createdAt: -1 });

export type CommentDocument = InferSchemaType<typeof CommentSchema>;
export default (models.Comment as Model<CommentDocument>) || model<CommentDocument>("Comment", CommentSchema);
