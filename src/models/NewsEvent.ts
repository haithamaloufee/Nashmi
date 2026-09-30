import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { NEWS_CATEGORIES } from "@/lib/news/types";
import { NEWS_EVENT_KINDS, NEWS_EVENT_STATUSES } from "@/lib/news/activityClassification";

export const NEWS_ACTION_STAGES = [
  "proposal", "cabinet_approved_reasons", "cabinet_approved_draft", "referred_to_parliament", "parliament_approved",
  "gazette_published", "effective", "decision_adopted", "instruction_issued",
  "directive", "enforcement_action", "media_reported", "unclear", "activity_announced", "activity_held", "discussion", "recommendation", "statement", "activity_postponed", "activity_cancelled", "institutional_update", "referred_to_committee", "vote_result", "committee_adopted", "effective_scheduled"
] as const;

const EventEvidenceSchema = new Schema({
  candidateId: { type: Schema.Types.ObjectId, ref: "NewsCandidate", required: true },
  url: { type: String, required: true, maxlength: 2048 },
  publisher: { type: String, required: true, maxlength: 160 },
  sourceTitle: { type: String, required: true, maxlength: 240 },
  sourceClass: { type: String, enum: ["official", "news_agency", "reputable_media"], required: true },
  aiInputAllowed: { type: Boolean, default: true },
  passage: { type: String, required: true, maxlength: 900 }
}, { _id: false });

const NewsEventSchema = new Schema({
  eventKey: { type: String, required: true, unique: true },
  titleAr: { type: String, required: true, maxlength: 180 },
  summaryAr: { type: String, required: true, maxlength: 900 },
  category: { type: String, enum: NEWS_CATEGORIES, required: true },
  eventKind: { type: String, enum: NEWS_EVENT_KINDS },
  eventStatus: { type: String, enum: NEWS_EVENT_STATUSES },
  scheduledAt: { type: Date, default: null },
  attributedTo: { type: String, maxlength: 160, default: null },
  authority: { type: String, required: true, maxlength: 160 },
  actionStage: { type: String, enum: NEWS_ACTION_STAGES, required: true },
  verification: { type: String, enum: ["official", "reported", "unclear"], required: true },
  aiInputAllowed: { type: Boolean, default: true },
  publishedAt: { type: Date, required: true },
  firstDiscoveredAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  evidence: { type: [EventEvidenceSchema], required: true },
  status: { type: String, enum: ["validated", "eligible", "excluded", "selected", "published", "hidden", "error"], required: true },
  reason: { type: String, default: null, maxlength: 160 },
  selectedRunId: { type: String, default: null },
  publishedNewsItemId: { type: Schema.Types.ObjectId, ref: "NewsItem", default: null },
  archiveUntil: { type: Date, required: true }
}, { timestamps: true });

NewsEventSchema.index({ status: 1, publishedAt: -1 });
NewsEventSchema.index({ archiveUntil: 1 }, { expireAfterSeconds: 0 });

export type NewsEventDocument = InferSchemaType<typeof NewsEventSchema>;
export default (models.NewsEvent as Model<NewsEventDocument>) || model<NewsEventDocument>("NewsEvent", NewsEventSchema);
