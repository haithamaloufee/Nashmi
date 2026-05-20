import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SurveyAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    optionId: { type: Schema.Types.ObjectId, default: null },
    optionIds: { type: [Schema.Types.ObjectId], default: [] },
    valueText: { type: String, default: null },
    valueNumber: { type: Number, default: null }
  },
  { _id: true, timestamps: true }
);

const SurveyResponseSchema = new Schema(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: "Survey", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: { type: [SurveyAnswerSchema], default: [] }
  },
  { timestamps: true }
);

SurveyResponseSchema.index({ surveyId: 1, userId: 1 }, { unique: true });
SurveyResponseSchema.index({ surveyId: 1, createdAt: -1 });
SurveyResponseSchema.index({ surveyId: 1, "answers.questionId": 1 });

export type SurveyResponseDocument = InferSchemaType<typeof SurveyResponseSchema>;
export default (models.SurveyResponse as Model<SurveyResponseDocument>) || model<SurveyResponseDocument>("SurveyResponse", SurveyResponseSchema);
