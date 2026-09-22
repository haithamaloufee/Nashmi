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
    lastDryRunCandidates: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

export type NewsRefreshStateDocument = InferSchemaType<typeof NewsRefreshStateSchema>;
export default (models.NewsRefreshState as Model<NewsRefreshStateDocument>) || model<NewsRefreshStateDocument>("NewsRefreshState", NewsRefreshStateSchema);
