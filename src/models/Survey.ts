import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SurveyOptionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, default: null },
    order: { type: Number, required: true, min: 0 }
  },
  { _id: true, timestamps: true }
);

const SurveyQuestionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    type: { type: String, enum: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO", "RATING", "TEXT"], required: true },
    required: { type: Boolean, default: true },
    order: { type: Number, required: true, min: 0 },
    options: { type: [SurveyOptionSchema], default: [] }
  },
  { _id: true, timestamps: true }
);

const SurveySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: null },
    authorType: { type: String, enum: ["party", "iec", "admin"], required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partyId: { type: Schema.Types.ObjectId, ref: "Party", default: null },
    publisherSnapshot: {
      id: { type: String, default: null },
      name: { type: String, default: null },
      type: { type: String, default: null },
      imageUrl: { type: String, default: null },
      href: { type: String, default: null },
      badge: { type: String, default: null }
    },
    status: { type: String, enum: ["draft", "published", "closed", "archived", "deleted"], default: "draft" },
    resultsVisibility: { type: String, enum: ["BEFORE_SUBMIT", "AFTER_SUBMIT", "PUBLISHER_ONLY"], default: "BEFORE_SUBMIT" },
    allowAnonymous: { type: Boolean, default: false },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    totalResponses: { type: Number, default: 0 },
    questions: { type: [SurveyQuestionSchema], default: [] },
    searchNormalized: { type: String, default: "" }
  },
  { timestamps: true }
);

SurveySchema.index({ slug: 1 }, { unique: true });
SurveySchema.index({ status: 1, publishedAt: -1 });
SurveySchema.index({ authorType: 1, status: 1, publishedAt: -1 });
SurveySchema.index({ partyId: 1, status: 1, publishedAt: -1 });
SurveySchema.index({ authorUserId: 1, createdAt: -1 });
SurveySchema.index({ searchNormalized: 1 });
SurveySchema.index({ title: "text", description: "text" });

export type SurveyDocument = InferSchemaType<typeof SurveySchema>;
export default (models.Survey as Model<SurveyDocument>) || model<SurveyDocument>("Survey", SurveySchema);
