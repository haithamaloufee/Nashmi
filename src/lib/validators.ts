import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { roles } from "@/lib/permissions";
import { isValidYoutubeVideoId } from "@/lib/youtube";
import { normalizeSafeImageUrl } from "@/lib/imageUrls";

export const objectIdSchema = z.string().refine((value) => isValidObjectId(value), "معرف غير صالح");
export const emailSchema = z.string().email("البريد الإلكتروني غير صالح").max(254);
export const passwordSchema = z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(128);
export const textSchema = z.string().trim().min(1).max(5000);
export const shortTextSchema = z.string().trim().min(1).max(200);
export const optionalUrlSchema = z.string().url("الرابط غير صالح").optional().nullable().or(z.literal(""));
export const optionalSafeLogoUrlSchema = z
  .union([z.string().max(2048), z.null()])
  .optional()
  .transform((value, context) => {
    if (value === undefined) return undefined;
    const normalized = normalizeSafeImageUrl(value, { localPrefixes: ["/images/"] });
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
  contactEmail: z.string().email().nullable().optional(),
  status: z.enum(["active", "disabled", "draft"]).default("active"),
  isVerified: z.boolean().default(true),
  createAccount: z.boolean().optional(),
  accountEmail: z.string().email().optional()
});

export const partyProfileUpdateSchema = partySchema.partial();

export const authorityLogoUpdateSchema = z.object({
  logoUrl: optionalSafeLogoUrlSchema
});

export const postCreateSchema = z.object({
  title: z.string().trim().max(180).nullable().optional(),
  content: z.string().trim().min(1).max(6000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  mediaIds: z.array(objectIdSchema).max(6).default([]),
  partyId: objectIdSchema.optional().nullable()
});

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
  expiresAt: z.string().datetime().nullable().optional(),
  partyId: objectIdSchema.optional().nullable()
});

export const pollUpdateSchema = pollCreateSchema.partial().extend({
  status: z.enum(["active", "closed", "hidden"]).optional()
});

export const voteSchema = z.object({
  optionId: objectIdSchema
});

export const lawSchema = z.object({
  title: shortTextSchema,
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  category: shortTextSchema,
  sourceName: shortTextSchema,
  sourceType: z.string().trim().min(2).max(120),
  articleNumber: z.string().trim().max(80).nullable().optional(),
  officialReferenceUrl: optionalUrlSchema,
  originalText: z.string().trim().max(10000).nullable().optional(),
  shortDescription: z.string().trim().min(5).max(500),
  simplifiedExplanation: z.string().trim().min(10).max(5000),
  practicalExample: z.string().trim().max(1500).nullable().optional(),
  youtubeVideoId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((value) => isValidYoutubeVideoId(value || null), "معرف يوتيوب غير صالح"),
  thumbnailUrl: optionalUrlSchema,
  tags: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  status: z.enum(["published", "draft", "hidden"]).default("published"),
  changeReason: z.string().trim().max(500).optional()
});

export const reportSchema = z.object({
  targetType: z.enum(["post", "poll", "comment", "party"]),
  targetId: objectIdSchema,
  reason: z.enum(["spam", "abuse", "misinformation", "hate", "other"]),
  details: z.string().trim().max(1000).nullable().optional()
});

export const moderationSchema = z.object({
  action: z.enum(["hide", "delete", "restore", "dismiss_report"]),
  reason: z.string().trim().min(3).max(1000)
});

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  sessionId: objectIdSchema.optional(),
  lawId: objectIdSchema.optional()
});

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "الرسالة مطلوبة").max(1200, "الرسالة طويلة جدًا"),
  lawId: objectIdSchema.optional()
});

export const chatSessionSchema = z.object({
  title: z.string().trim().max(160).nullable().optional()
});
