import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const NewsRefreshStateSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    lockToken: { type: String, default: null },
    lockUntil: { type: Date, default: null },
    lastStartedAt: { type: Date, default: null },
    lastCompletedAt: { type: Date, default: null },
    lastStatus: { type: String, enum: ["never", "running", "success", "failed", "dry_run"], default: "never" },
    lastRunId: { type: String, default: null },
    lastError: { type: String, default: null, maxlength: 500 },
    lastStats: { type: Schema.Types.Mixed, default: null },
    lastDryRunCandidates: { type: [Schema.Types.Mixed], default: [] },
    currentBatchId: { type: String, default: null },
    currentBatchCreatedAt: { type: Date, default: null },
    currentBatchWindowStart: { type: Date, default: null },
    currentBatchWindowEnd: { type: Date, default: null },
    pipelineDiscoveryLockToken: { type: String, default: null },
    pipelineDiscoveryLockUntil: { type: Date, default: null },
    pipelineEditorialLockToken: { type: String, default: null },
    pipelineEditorialLockUntil: { type: Date, default: null },
    pipelineLastDiscoveryAt: { type: Date, default: null },
    pipelineLastEditorialAt: { type: Date, default: null },
    pipelineLastPublishedAt: { type: Date, default: null },
    pipelinePublishedJordanDay: { type: String, default: null },
    pipelineLastDiscoveryStats: { type: Schema.Types.Mixed, default: null },
    pipelineLastEditorialStats: { type: Schema.Types.Mixed, default: null },
    pipelineSourceHealth: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export type NewsRefreshStateDocument = InferSchemaType<typeof NewsRefreshStateSchema>;
export default (models.NewsRefreshState as Model<NewsRefreshStateDocument>) || model<NewsRefreshStateDocument>("NewsRefreshState", NewsRefreshStateSchema);
