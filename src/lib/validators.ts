import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { roles } from "@/lib/permissions";
import { normalizeYoutubeInput } from "@/lib/youtube";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";
import { allowedPollDurationDays, defaultPollDurationDays } from "@/lib/polls";
import { surveyQuestionTypes, surveyResultVisibilities, surveyStatuses } from "@/lib/surveys";

export const objectIdSchema = z.string().refine((value) => isValidObjectId(value), "معرف غير صالح");
export const emailSchema = z.string().email("البريد الإلكتروني غير صالح").max(254);
export const passwordSchema = z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(128);
export const textSchema = z.string().trim().min(1).max(5000);
export const shortTextSchema = z.string().trim().min(1).max(200);
export const optionalUrlSchema = z.string().url("الرابط غير صالح").optional().nullable().or(z.literal(""));
export const optionalSafeUrlSchema = z
  .union([z.string().max(2048), z.null()])
  .optional()
  .transform((value, context) => {
    if (value === undefined) return undefined;
    const raw = (value || "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol.toLowerCase()) || url.username || url.password) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "الرابط يجب أن يكون http أو https فقط" });
        return z.NEVER;
      }
      return url.toString();
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "الرابط غير صالح" });
      return z.NEVER;
    }
  });
export const optionalSafeLogoUrlSchema = z
  .union([z.string().max(2048), z.null()])
  .optional()
  .transform((value, context) => {
    if (value === undefined) return undefined;
    const normalized = normalizeSafeImageUrl(value, { localPrefixes: ["/images/", "/uploads/", "/related/"] });
    if (value && !normalized) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "رابط الصورة غير آمن أو غير مدعوم" });
      return z.NEVER;
    }
    return normalized;
  });

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  language: z.enum(["ar", "en"]).optional()
});

export const adminUserStatusSchema = z.object({
  status: z.enum(["active", "disabled", "pending", "locked"])
});

export const adminUserRoleSchema = z.object({
  role: z.enum(roles)
});

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema.default("Password123!"),
  role: z.enum(roles).default("citizen"),
  status: z.enum(["active", "disabled", "pending", "locked"]).default("active")
});

const dateTextSchema = z.string().trim().min(1).max(50).nullable().optional();

const partySocialLinksSchema = z.object({
  website: optionalUrlSchema,
  facebook: optionalUrlSchema,
  x: optionalUrlSchema,
  instagram: optionalUrlSchema,
  youtube: optionalUrlSchema
}).default({});

const partyOfficialRegistrySchema = z.object({
  registryUrl: optionalUrlSchema,
  nationalNumber: z.string().trim().max(120).nullable().optional(),
  secretaryGeneral: z.string().trim().max(200).nullable().optional(),
  mainHeadquarters: z.string().trim().max(500).nullable().optional(),
  foundingOrConferenceDate: dateTextSchema,
  mergerDate: dateTextSchema,
  sourceName: z.string().trim().max(200).nullable().optional(),
  sourceCheckedAt: dateTextSchema
}).default({});

const partyContactSchema = z.object({
  phones: z.array(z.string().trim().min(3).max(80)).default([]),
  email: z.string().email().nullable().optional(),
  website: optionalUrlSchema,
  headquarters: z.string().trim().max(500).nullable().optional(),
  branches: z.array(z.string().trim().min(1).max(300)).default([])
}).default({});

const partyStatisticsSchema = z.object({
  membersCount: z.number().int().min(0).nullable().optional(),
  womenMembersCount: z.number().int().min(0).nullable().optional(),
  youthMembersCount: z.number().int().min(0).nullable().optional(),
  menMembersCount: z.number().int().min(0).nullable().optional(),
  branchesCount: z.number().int().min(0).nullable().optional(),
  statisticsNote: z.string().trim().max(1000).nullable().optional()
}).default({});

const partyCommitteeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).nullable().optional(),
  members: z.array(z.string().trim().min(1).max(160)).default([]),
  contact: z.string().trim().max(250).nullable().optional()
});

const partyAchievementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: dateTextSchema,
  description: z.string().trim().max(1000).nullable().optional(),
  sourceUrl: optionalUrlSchema
});

const partyDataQualitySchema = z.object({
  registryDataVerified: z.boolean().default(false),
  officialWebsiteVerified: z.boolean().default(false),
  socialLinksNeedManualVerification: z.boolean().default(true),
  statisticsNeedManualVerification: z.boolean().default(true),
  imagesDeferred: z.boolean().default(true),
  notes: z.string().trim().max(1000).nullable().optional()
}).default({});

export const partySchema = z.object({
  name: shortTextSchema,
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  shortDescription: z.string().trim().min(10).max(280),
  description: z.string().trim().min(20).max(4000),
  foundedYear: z.number().int().min(1900).max(2100).nullable().optional(),
  vision: z.string().trim().min(5).max(1500),
  goals: z.array(z.string().trim().min(2).max(180)).max(8).default([]),
  socialLinks: partySocialLinksSchema,
  officialRegistry: partyOfficialRegistrySchema,
  contact: partyContactSchema,
  statistics: partyStatisticsSchema,
  committees: z.array(partyCommitteeSchema).default([]),
  latestAchievements: z.array(partyAchievementSchema).default([]),
  dataQuality: partyDataQualitySchema,
  logoUrl: optionalSafeLogoUrlSchema,
  coverUrl: optionalSafeLogoUrlSchema,
  contactEmail: z.string().email().nullable().optional(),
  status: z.enum(["active", "disabled", "draft"]).default("active"),
  isVerified: z.boolean().default(true),
  createAccount: z.boolean().optional(),
  accountEmail: z.string().email().optional()
});

export const partyProfileUpdateSchema = partySchema.partial();

export const authorityLogoUpdateSchema = z.object({
  logoUrl: optionalSafeLogoUrlSchema,
  coverUrl: optionalSafeLogoUrlSchema
});

export const postCreateSchema = z.object({
  title: z.string().trim().max(180).nullable().optional(),
  content: z.string().trim().min(1).max(6000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  mediaIds: z.array(objectIdSchema).max(6).default([]),
  partyId: objectIdSchema.optional().nullable()
}).strict("لا يمكن إرسال روابط وسائط يدوية. استخدم رفع الملفات من الجهاز.");

export const postUpdateSchema = postCreateSchema.partial().extend({
  status: z.enum(["published", "hidden"]).optional()
});

export const reactionSchema = z.object({
  type: z.enum(["like", "dislike"])
});

export const commentSchema = z.object({
  content: z.string().trim().min(1).max(1000)
});

export const pollCreateSchema = z.object({
  question: z.string().trim().min(5).max(300),
  description: z.string().trim().max(1000).nullable().optional(),
  options: z.array(z.string().trim().min(1).max(160)).min(2).max(6),
  resultsVisibility: z.enum(["always", "after_vote", "after_close"]).default("always"),
  durationDays: z.coerce.number().int().refine((value) => allowedPollDurationDays.includes(value as never), "مدة التصويت غير صالحة").default(defaultPollDurationDays),
  expiresAt: z.string().datetime().nullable().optional(),
  partyId: objectIdSchema.optional().nullable()
});

export const pollUpdateSchema = pollCreateSchema.partial().extend({
  status: z.enum(["active", "closed", "hidden"]).optional()
});

export const voteSchema = z.object({
  optionId: objectIdSchema
});

const surveyOptionInputSchema = z.object({
  id: objectIdSchema.optional(),
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().max(120).nullable().optional(),
  order: z.coerce.number().int().min(0).default(0)
});

const surveyQuestionInputSchema = z.object({
  id: objectIdSchema.optional(),
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(800).nullable().optional(),
  type: z.enum(surveyQuestionTypes),
  required: z.boolean().default(true),
  order: z.coerce.number().int().min(0).default(0),
  options: z.array(surveyOptionInputSchema).max(12).default([])
}).superRefine((question, context) => {
  if ((question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE") && question.options.length < 2) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Choice questions require at least two options" });
  }
  if ((question.type === "RATING" || question.type === "TEXT") && question.options.length > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "This question type does not accept options" });
  }
});

function validSurveyDateRange(input: { startsAt?: string | null; endsAt?: string | null }, context: z.RefinementCtx) {
  if (!input.startsAt || !input.endsAt) return;
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "Invalid survey date" });
    return;
  }
  if (startsAt.getTime() >= endsAt.getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Survey end date must be after start date" });
  }
}

const surveyBaseSchema = z.object({
  title: z.string().trim().min(5).max(220),
  slug: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{N}-]+$/u).optional(),
  description: z.string().trim().max(1500).nullable().optional(),
  status: z.enum(surveyStatuses).default("draft"),
  publisherType: z.enum(["party", "iec", "admin"]).optional(),
  resultsVisibility: z.enum(surveyResultVisibilities).default("BEFORE_SUBMIT"),
  startsAt: z.string().trim().max(80).nullable().optional(),
  endsAt: z.string().trim().max(80).nullable().optional(),
  partyId: objectIdSchema.optional().nullable(),
  questions: z.array(surveyQuestionInputSchema).min(1).max(30)
});

export const surveyCreateSchema = surveyBaseSchema.superRefine(validSurveyDateRange);

export const surveyUpdateSchema = surveyBaseSchema.partial().extend({
  status: z.enum(surveyStatuses).optional()
}).superRefine(validSurveyDateRange);

export const surveyAnswerSchema = z.object({
  questionId: objectIdSchema,
  optionId: objectIdSchema.nullable().optional(),
  optionIds: z.array(objectIdSchema).max(12).optional(),
  valueText: z.string().trim().max(1000).nullable().optional(),
  valueNumber: z.coerce.number().min(1).max(5).nullable().optional()
});

export const surveyResponseSchema = z.object({
  answers: z.array(surveyAnswerSchema).max(60)
});

export const aboutNashmiSchema = z.object({
  titleAr: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  bodyAr: z.string().trim().min(10).max(6000),
  bodyEn: z.string().trim().min(10).max(6000),
  youtubeUrl: z
    .string()
    .trim()
    .max(2048)
    .nullable()
    .optional()
    .transform((value, context) => {
      const raw = (value || "").trim();
      if (!raw) return null;
      const normalized = normalizeYoutubeInput(raw);
      if (!normalized) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "رابط يوتيوب غير صالح" });
        return z.NEVER;
      }
      return normalized.url;
    })
});

export const lawSchema = z.object({
  title: shortTextSchema,
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  category: shortTextSchema,
  sourceName: shortTextSchema,
  sourceType: z.string().trim().min(2).max(120),
  articleNumber: z.string().trim().max(80).nullable().optional(),
  officialReferenceUrl: optionalSafeUrlSchema,
  originalText: z.string().trim().max(10000).nullable().optional(),
  shortDescription: z.string().trim().min(5).max(500),
  simplifiedExplanation: z.string().trim().min(10).max(5000),
  practicalExample: z.string().trim().max(1500).nullable().optional(),
  youtubeVideoId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value, context) => {
      const raw = (value || "").trim();
      if (!raw) return null;
      const normalized = normalizeYoutubeInput(raw);
      if (!normalized) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "رابط أو معرف YouTube غير صالح" });
        return z.NEVER;
      }
      return normalized.id;
    }),
  youtubeUrl: optionalSafeUrlSchema,
  thumbnailUrl: optionalSafeLogoUrlSchema,
  tags: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  status: z.enum(["published", "draft", "hidden"]).default("published"),
  changeReason: z.string().trim().max(500).optional()
});

export const reportSchema = z.object({
  targetType: z.enum(["post", "poll", "comment", "party", "user"]),
  targetId: objectIdSchema,
  reason: z.enum(["spam", "abuse", "misinformation", "hate", "other"]),
  details: z.string().trim().max(1000).nullable().optional()
});

export const moderationSchema = z.object({
  action: z.enum(["hide", "delete", "restore", "dismiss_report"]),
  reason: z.string().trim().min(3).max(1000)
});

const chatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  // Allow longer stored/displayed assistant messages. History items will be
  // truncated server-side before sending to the AI provider (see chatSession).
  content: z.string().trim().min(1).max(10000)
});

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  sessionId: objectIdSchema.optional(),
  lawId: objectIdSchema.optional(),
  language: z.enum(["ar", "en"]).optional(),
  history: z.array(chatHistoryItemSchema).max(8).optional()
});

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "الرسالة مطلوبة").max(1500, "الرسالة طويلة جدًا"),
  lawId: objectIdSchema.optional(),
  language: z.enum(["ar", "en"]).optional()
});

export const chatSessionSchema = z.object({
  title: z.string().trim().max(160).nullable().optional()
});
