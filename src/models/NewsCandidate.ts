import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const NewsCandidateSchema = new Schema({
  sourceId: { type: String, required: true, index: true },
  extractionVersion: { type: Number, default: 1 },
  publisher: { type: String, required: true },
  sourceClass: { type: String, enum: ["official", "news_agency", "reputable_media"], required: true },
  originalUrl: { type: String, required: true, maxlength: 2048 },
  urlHash: { type: String, required: true },
  originalTitle: { type: String, required: true, maxlength: 240 },
  originalSummary: { type: String, required: true, maxlength: 900 },
  evidenceParagraphs: { type: [String], default: [] },
  publishedAt: { type: Date, required: true },
  datePrecision: { type: String, enum: ["time", "day"], required: true },
  publicationVerified: { type: Boolean, default: true },
  aiInputAllowed: { type: Boolean, default: true },
  firstDiscoveredAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  status: { type: String, enum: ["discovered", "validated", "eligible", "excluded", "error", "selected", "published"], default: "discovered" },
  reason: { type: String, default: null, maxlength: 160 },
  eventIds: { type: [Schema.Types.ObjectId], ref: "NewsEvent", default: [] },
  archiveUntil: { type: Date, required: true }
}, { timestamps: true });

NewsCandidateSchema.index({ sourceId: 1, urlHash: 1 }, { unique: true });
NewsCandidateSchema.index({ status: 1, publishedAt: -1 });
NewsCandidateSchema.index({ archiveUntil: 1 }, { expireAfterSeconds: 0 });

export type NewsCandidateDocument = InferSchemaType<typeof NewsCandidateSchema>;
export default (models.NewsCandidate as Model<NewsCandidateDocument>) || model<NewsCandidateDocument>("NewsCandidate", NewsCandidateSchema);
