import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Types } from "mongoose";
import { storePublicFile } from "../src/lib/storage";
import { buildPartyMatchIndexes, matchPartyByName, normalizeArabicPartyName, normalizePartyLogoRecord } from "../src/lib/partyMatching";
import { snapshotFromPost } from "../src/lib/publisher";
import { normalizeMediaAssets } from "../src/lib/media";
import { hasValidUploadMagic, validateUploadFile, validateUploadMetadata } from "../src/lib/uploadValidation";
import { adminUserCreateSchema, chatSchema, passwordSchema, postCreateSchema, profileUpdateSchema } from "../src/lib/validators";
import { buildSurveyResultSummary, canRespondToSurvey, canViewSurveyResults, getSurveyHref, getSurveyLifecycleStatus, objectIdString, redactSurveyResults, validateSurveyAnswers } from "../src/lib/surveys";
import { formatDate } from "../src/lib/localization";
import { canManageUser, canModerateUser } from "../src/lib/permissions";
import { counterUpdatePipeline, reactionCounterDelta } from "../src/lib/reactions";
import { isBlockedNetworkAddress, validateVercelBlobUrl } from "../src/lib/remoteFetch";
import { safeMarkdownHref } from "../src/lib/markdown";
import { getGeminiApiKey, getMongoUri } from "../src/lib/env";
import { readJsonWithLimit } from "../src/lib/routeUtils";
import { sessionVersionMatches, signAuthToken } from "../src/lib/jwt";
import { verifyEdgeAuthToken } from "../src/lib/jwtEdge";
import { buildBoundedConversation, classifyAiProviderError } from "../src/lib/ai/resilience";
import { createEmailVerificationToken, createPasswordResetToken, hashAuthToken } from "../src/lib/authTokensCore";
import { buildSiteUrl } from "../src/lib/siteUrl";
import { accountInvitationEmail, passwordResetEmail, verificationEmail } from "../src/lib/emailTemplates";

function makeFile(name: string, type: string, size: number) {
  return new File([new Uint8Array(size || 1)], name, { type });
}

async function testPartyMatching() {
  assert.equal(normalizeArabicPartyName("حِزْبُ الإصلاح"), "حزب الاصلاح");
  const parties = [{ name: "حزب الأمة", slug: "ummah" }, { name: "الحزب الديمقراطي الاجتماعي الأردني", slug: "social" }];
  const indexes = buildPartyMatchIndexes(parties);
  assert.equal(matchPartyByName("حزب الامه", indexes)[0]?.slug, "ummah");
  assert.equal(matchPartyByName("الديمقراطي الاجتماعي الاردني", indexes)[0]?.slug, "social");
  assert.deepEqual(normalizePartyLogoRecord({ "اسم_الحزب": "حزب الاختبار", "الرابط": "https://parties.iec.jo/storage/logo.png" }), {
    name: "حزب الاختبار",
    imageUrl: "https://parties.iec.jo/storage/logo.png"
  });
}

async function testUploadValidation() {
  assert.equal(validateUploadFile(makeFile("a.jpg", "image/jpeg", 1024), { imagesOnly: true }), null);
  assert.equal(validateUploadFile(makeFile("a.gif", "image/gif", 1024), { imagesOnly: true }), null);
  assert.equal(validateUploadFile(makeFile("a.mp4", "video/mp4", 1024)), null);
  assert.match(validateUploadFile(makeFile("a.svg", "image/svg+xml", 1024), { imagesOnly: true }) || "", /نوع الصورة غير مدعوم/);
  assert.match(validateUploadFile(makeFile("a.jpg", "image/png", 1024), { imagesOnly: true }) || "", /امتداد الملف/);
  assert.equal(validateUploadMetadata({ fileName: "a.mp4", mimeType: "video/mp4", size: 100 * 1024 * 1024 }), null);
  assert.match(validateUploadMetadata({ fileName: "a.mp4", mimeType: "video/mp4", size: 101 * 1024 * 1024 }) || "", /100MB/);

  assert.equal(hasValidUploadMagic(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg"), true);
  assert.equal(hasValidUploadMagic(Buffer.from("not an image"), "image/jpeg"), false);
}

function testPostMediaUrlRejection() {
  assert.throws(
    () => postCreateSchema.parse({ content: "test", mediaUrl: "https://example.com/file.jpg" }),
    /روابط وسائط|Unrecognized key/
  );
}

function testDefaultPostMediaFiltering() {
  const media = normalizeMediaAssets([
    {
      _id: "seeded-party-logo",
      url: "https://parties.iec.jo/storage/logo.png",
      storageKey: "default-post-media/party/abc",
      purpose: "post",
      provider: "local_dev",
      status: "active"
    },
    {
      _id: "seeded-related-logo",
      url: "/related/iec-logo.png",
      storageKey: "default-post-media/authority/iec",
      purpose: "post",
      provider: "local_dev",
      status: "active"
    },
    {
      _id: "real-blob-upload",
      url: "https://example.public.blob.vercel-storage.com/media/direct/file.jpg",
      storageKey: "media/direct/file.jpg",
      purpose: "post",
      provider: "vercel_blob",
      status: "active"
    },
    {
      _id: "real-local-upload",
      url: "/uploads/media/user/file.jpg",
      storageKey: "media/user/file.jpg",
      purpose: "post",
      provider: "local_dev",
      status: "active"
    }
  ]);
  assert.deepEqual(media.map((item) => item.id), ["real-blob-upload", "real-local-upload"]);
}

async function testMissingBlobToken() {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercel = process.env.VERCEL;
  const previousBlob = process.env.BLOB_READ_WRITE_TOKEN;
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "production";
  delete process.env.VERCEL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  await assert.rejects(
    storePublicFile({ buffer: Buffer.from("x"), storageKey: "tests/file.txt", contentType: "text/plain" }),
    /BLOB_STORAGE_NOT_CONFIGURED/
  );
  if (previousNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previousNodeEnv;
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
  if (previousBlob === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = previousBlob;
}

async function testPublisherSnapshot() {
  const partyPost = {
    authorType: "party",
    partyId: { name: "حزب الاختبار", slug: "test-party", logoUrl: "https://parties.iec.jo/storage/logo.png", isVerified: true },
    authorUserId: { name: "ناشر", avatarUrl: null, image: null }
  };
  assert.deepEqual(snapshotFromPost(partyPost), {
    id: null,
    type: "party",
    name: "حزب الاختبار",
    imageUrl: "https://parties.iec.jo/storage/logo.png",
    href: "/parties/test-party",
    badge: "حزب موثق"
  });

  const iecPost = { authorType: "iec", authorUserId: { name: "الهيئة" } };
  assert.equal(snapshotFromPost(iecPost, { name: "الهيئة المستقلة للانتخاب", logoUrl: "/related/iec-logo.png" }).imageUrl, "/related/iec-logo.png");
}

function testLogoAssetReferences() {
  const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf8");
  assert.match(navbar, /\/images\/nashmi logo_transparent\.png/);
  assert.doesNotMatch(navbar, /nashmi logo_cropped/);
}

function testDateFormattingUsesApplicationTimeZone() {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = "UTC";
  try {
    assert.equal(formatDate("2026-05-21T22:00:00.000Z", "en"), "May 22, 2026");
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
}

function testSurveyUtilities() {
  const realQuestionId = new Types.ObjectId();
  const realOptionId = new Types.ObjectId();
  assert.equal(objectIdString(realQuestionId), realQuestionId.toHexString());
  assert.equal(objectIdString({ _id: realQuestionId }), realQuestionId.toHexString());
  assert.equal(getSurveyHref({ slug: "community-pulse-test" }), "/surveys/community-pulse-test");
  assert.equal(getSurveyHref({ _id: realQuestionId }), `/surveys/${realQuestionId.toHexString()}`);
  assert.equal(getSurveyHref({}), null);

  const survey = {
    _id: "665000000000000000000001",
    status: "published",
    startsAt: new Date(Date.now() - 1000).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    resultsVisibility: "AFTER_SUBMIT",
    questions: [
      {
        _id: "665000000000000000000101",
        title: "Question one",
        type: "SINGLE_CHOICE" as const,
        required: true,
        order: 0,
        options: [
          { _id: "665000000000000000000201", label: "A", order: 0 },
          { _id: "665000000000000000000202", label: "B", order: 1 }
        ]
      },
      {
        _id: "665000000000000000000102",
        title: "Rating",
        type: "RATING" as const,
        required: false,
        order: 1,
        options: []
      }
    ]
  };

  assert.equal(getSurveyLifecycleStatus(survey), "open");
  assert.equal(canRespondToSurvey(survey, { id: "u1", role: "citizen", status: "active" }, false), true);
  assert.equal(canViewSurveyResults({ survey, viewer: null, hasResponded: false, isManager: false }), false);
  assert.equal(canViewSurveyResults({ survey, viewer: { id: "u1", role: "citizen" }, hasResponded: true, isManager: false }), true);
  assert.throws(() => validateSurveyAnswers(survey, []), /REQUIRED_ANSWER_MISSING/);
  assert.deepEqual(validateSurveyAnswers(survey, [{ questionId: "665000000000000000000101", optionId: "665000000000000000000201" }]), [
    { questionId: "665000000000000000000101", optionId: "665000000000000000000201" }
  ]);

  const summary = buildSurveyResultSummary(survey, [
    { answers: [{ questionId: "665000000000000000000101", optionId: "665000000000000000000201" }, { questionId: "665000000000000000000102", valueNumber: 5 }] },
    { answers: [{ questionId: "665000000000000000000101", optionId: "665000000000000000000202" }, { questionId: "665000000000000000000102", valueNumber: 3 }] }
  ]);
  assert.equal(summary.totalResponses, 2);
  assert.equal(summary.questions[0].options[0].count, 1);
  assert.equal(summary.questions[0].options[0].percentage, 50);
  assert.equal(summary.questions[1].averageRating, 4);

  const realObjectIdSurvey = {
    status: "published",
    questions: [
      {
        _id: realQuestionId,
        title: "Real ObjectId question",
        type: "SINGLE_CHOICE" as const,
        required: true,
        order: 0,
        options: [{ _id: realOptionId, label: "Real option", order: 0 }]
      }
    ]
  };
  const realObjectIdSummary = buildSurveyResultSummary(realObjectIdSurvey, [
    { answers: [{ questionId: realQuestionId.toHexString(), optionId: realOptionId.toHexString() }] }
  ]);
  assert.equal(realObjectIdSummary.questions[0].id, realQuestionId.toHexString());
  assert.equal(realObjectIdSummary.questions[0].options[0].id, realOptionId.toHexString());
  assert.equal(realObjectIdSummary.questions[0].options[0].count, 1);
}

function testSecurityRegressionRules() {
  const actorAdmin = { id: "admin-1", role: "admin" as const };
  const actorSuper = { id: "super-1", role: "super_admin" as const };
  const targetSuper = { id: "super-2", role: "super_admin" as const };
  const targetAdmin = { id: "admin-2", role: "admin" as const };
  const targetCitizen = { id: "citizen-1", role: "citizen" as const };
  assert.equal(canManageUser(actorAdmin, targetAdmin), false);
  assert.equal(canManageUser(actorAdmin, targetSuper), false);
  assert.equal(canModerateUser(actorAdmin, targetSuper, "hide"), false);
  assert.equal(canModerateUser(actorAdmin, targetCitizen, "hide"), true);
  assert.equal(canModerateUser(actorSuper, targetAdmin, "hide"), true);
  assert.equal(canModerateUser(actorSuper, actorSuper, "hide"), false);

  const profile = profileUpdateSchema.parse({ name: "مستخدم آمن", emailVerified: true, isVerified: true, role: "super_admin", status: "active" });
  assert.deepEqual(profile, { name: "مستخدم آمن" });
  assert.throws(() => adminUserCreateSchema.parse({ name: "حساب", email: "safe@example.com", password: "Password123!" }));
  assert.throws(() => passwordSchema.parse("Password123!"));

  const hidden = redactSurveyResults({ totalResponses: 19, resultSummary: { totalResponses: 19 }, title: "Hidden" }, false);
  assert.equal(hidden.totalResponses, null);
  assert.equal(hidden.resultSummary, null);
  assert.equal(canViewSurveyResults({ survey: { resultsVisibility: "PUBLISHER_ONLY" }, viewer: targetCitizen, hasResponded: true, isManager: false }), false);

  assert.deepEqual(reactionCounterDelta(null, "like"), { likesCount: 1, dislikesCount: 0 });
  assert.deepEqual(reactionCounterDelta("like", "dislike"), { likesCount: -1, dislikesCount: 1 });
  assert.deepEqual(reactionCounterDelta("dislike", null), { likesCount: 0, dislikesCount: -1 });
  assert.match(JSON.stringify(counterUpdatePipeline({ likesCount: -1, dislikesCount: 0 })), /\$max/);
  assert.equal(sessionVersionMatches(0, undefined), true);
  assert.equal(sessionVersionMatches(4, 4), true);
  assert.equal(sessionVersionMatches(3, 4), false);

  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isBlockedNetworkAddress(address), true, `${address} must be blocked`);
  }
  assert.equal(isBlockedNetworkAddress("8.8.8.8"), false);
  assert.equal(validateVercelBlobUrl("https://store.public.blob.vercel-storage.com/media/direct/file.jpg", "media/direct/file.jpg").hostname, "store.public.blob.vercel-storage.com");
  for (const value of [
    "http://store.public.blob.vercel-storage.com/media/direct/file.jpg",
    "https://localhost/media/direct/file.jpg",
    "https://evil-public.blob.vercel-storage.com.attacker.test/media/direct/file.jpg",
    "https://store.public.blob.vercel-storage.com/media/direct/other.jpg",
    "https://store.public.blob.vercel-storage.com/media/direct/file.jpg?redirect=http://127.0.0.1"
  ]) assert.throws(() => validateVercelBlobUrl(value, "media/direct/file.jpg"));

  assert.equal(safeMarkdownHref("javascript:alert(1)"), undefined);
  assert.equal(safeMarkdownHref("data:text/html,test"), undefined);
  assert.equal(safeMarkdownHref("/laws/election"), "/laws/election");
  assert.match(safeMarkdownHref("https://iec.jo") || "", /^https:\/\//);
  const aiSource = readFileSync("src/lib/ai/gemini.ts", "utf8");
  assert.match(aiSource, /بيانات غير موثوقة/);
  assert.match(aiSource, /نتائج استبيانات مخفية/);
}

async function testAiEndpointBoundaries() {
  assert.throws(() => chatSchema.parse({ message: "" }));
  assert.throws(() => chatSchema.parse({ message: "x".repeat(1501) }));
  assert.throws(() => chatSchema.parse({ message: "hello", history: Array.from({ length: 9 }, () => ({ role: "user", content: "x" })) }));
  await assert.rejects(
    readJsonWithLimit(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ message: "x".repeat(17_000) }) }), chatSchema, 16 * 1024),
    /PAYLOAD_TOO_LARGE/
  );

  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    assert.throws(() => getGeminiApiKey(), /GEMINI_API_KEY/);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }

  const aiSource = readFileSync("src/lib/ai/gemini.ts", "utf8");
  assert.match(aiSource, /party_recommendation_refused/);
  assert.match(aiSource, /withTimeout/);
  assert.doesNotMatch(aiSource, /NEXT_PUBLIC_GEMINI/);
  assert.ok(
    aiSource.indexOf("const config = getSharekAssistantConfig()") > aiSource.indexOf("if (isOutOfScopeRequest(params.message))"),
    "Local AI safety responses must not require provider configuration"
  );
  const bounded = buildBoundedConversation(
    Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: "x".repeat(2_000) })),
    "latest question",
    6_000
  );
  assert.ok(bounded.reduce((total, item) => total + item.content.length, 0) <= 6_000);
  assert.equal(bounded.at(-1)?.content, "latest question");
  assert.deepEqual(classifyAiProviderError(Object.assign(new Error("quota exceeded"), { status: 429 })), { code: "rate_limit", retryable: true });
  assert.deepEqual(classifyAiProviderError(new Error("request timed out")), { code: "timeout", retryable: true });
  assert.deepEqual(classifyAiProviderError(new Error("malformed response")), { code: "unknown", retryable: false });

  const resetSource = readFileSync("src/app/api/auth/reset-password/route.ts", "utf8");
  assert.match(resetSource, /sessionVersion/);
  assert.match(resetSource, /passwordChangedAt/);
  const legacyAuditSource = readFileSync("scripts/audit-legacy-credentials.ts", "utf8");
  assert.match(legacyAuditSource, /--delivery-ready/);
  assert.doesNotMatch(legacyAuditSource, /Password123!/);
}

function testMongoSeedListValidation() {
  const previous = process.env.MONGODB_URI;
  const seedList = "mongodb://user:password@db-a.example.test:27017,db-b.example.test:27017/nashmi?replicaSet=atlas";
  process.env.MONGODB_URI = seedList;
  try {
    assert.equal(getMongoUri(), seedList);
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
}

function testMongoEnvironmentIsolation() {
  const previousUri = process.env.MONGODB_URI;
  const previousEnvironment = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    process.env.MONGODB_URI = "mongodb+srv://example.test/sharek?retryWrites=true";
    assert.throws(() => getMongoUri(), /PREVIEW_DATABASE_ISOLATION_FAILED/);
    process.env.MONGODB_URI = "mongodb+srv://example.test/nashmi_preview?retryWrites=true";
    assert.equal(getMongoUri(), process.env.MONGODB_URI);

    process.env.VERCEL_ENV = "production";
    assert.throws(() => getMongoUri(), /PRODUCTION_DATABASE_ISOLATION_FAILED/);
    process.env.MONGODB_URI = "mongodb+srv://example.test/sharek?retryWrites=true";
    assert.equal(getMongoUri(), process.env.MONGODB_URI);
  } finally {
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
  }
}

async function testSessionTokenVerification() {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-session-secret-with-at-least-32-characters";
  try {
    const token = await signAuthToken({ _id: new Types.ObjectId(), role: "citizen", sessionVersion: 7 });
    const payload = await verifyEdgeAuthToken(token);
    assert.equal(payload?.role, "citizen");
    assert.equal(payload?.sessionVersion, 7);
    assert.equal(await verifyEdgeAuthToken(`${token.slice(0, -2)}xx`), null);
    assert.equal(await verifyEdgeAuthToken("not-a-jwt"), null);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
}

function testAuthEmailSecurity() {
  const verification = createEmailVerificationToken();
  const reset = createPasswordResetToken();
  assert.notEqual(verification.token, verification.tokenHash);
  assert.equal(hashAuthToken(verification.token), verification.tokenHash);
  assert.notEqual(verification.tokenHash, reset.tokenHash);
  assert.ok(verification.expiresAt.getTime() > reset.expiresAt.getTime());

  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://nashmi.haitham.website";
  try {
    const url = buildSiteUrl("/verify-email", { token: "test-token" });
    assert.equal(url, "https://nashmi.haitham.website/verify-email?token=test-token");
    assert.doesNotMatch(url, /hythem|neshme|nashmii\.vercel/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }

  const ar = verificationEmail("ar", "https://nashmi.haitham.website/verify-email?token=test");
  const en = passwordResetEmail("en", "https://nashmi.haitham.website/reset-password?token=test");
  const invite = accountInvitationEmail("ar", "https://nashmi.haitham.website/set-password?token=test");
  assert.match(ar.html, /lang="ar" dir="rtl"/);
  assert.match(en.html, /lang="en" dir="ltr"/);
  assert.match(invite.text, /nashmi\.haitham\.website/);

  const verifySource = readFileSync("src/app/api/auth/verify-email/route.ts", "utf8");
  const resetSource = readFileSync("src/app/api/auth/reset-password/route.ts", "utf8");
  const setupSource = readFileSync("src/app/api/auth/set-password/route.ts", "utf8");
  assert.match(verifySource, /emailVerificationExpiresAt: \{ \$gt: new Date\(\) \}/);
  assert.match(verifySource, /emailVerificationTokenHash: null/);
  assert.match(resetSource, /passwordResetTokenHash: null/);
  assert.match(resetSource, /sessionVersion/);
  assert.match(resetSource, /passwordHash: \{ \$literal: passwordHash \}/);
  assert.match(setupSource, /passwordHash: \{ \$literal: passwordHash \}/);
  assert.doesNotMatch(resetSource, /passwordSetupTokenHash/);
}

async function main() {
  await testPartyMatching();
  await testUploadValidation();
  await testMissingBlobToken();
  await testPublisherSnapshot();
  testLogoAssetReferences();
  testDateFormattingUsesApplicationTimeZone();
  testSurveyUtilities();
  testPostMediaUrlRejection();
  testDefaultPostMediaFiltering();
  testSecurityRegressionRules();
  testMongoSeedListValidation();
  testMongoEnvironmentIsolation();
  await testAiEndpointBoundaries();
  await testSessionTokenVerification();
  testAuthEmailSecurity();
  console.log("Critical tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
