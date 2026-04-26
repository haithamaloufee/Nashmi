import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AuditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipHash: { type: String, default: null },
    userAgentHash: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof AuditLogSchema>;
export default (models.AuditLog as Model<AuditLogDocument>) || model<AuditLogDocument>("AuditLog", AuditLogSchema);
