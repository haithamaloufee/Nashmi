import bcrypt from "bcryptjs";
import { formatSafeError, loadEnv } from "./env";

// Load environment variables before importing anything else
loadEnv();

import { connectToDatabase, mongoose } from "../src/lib/db";
import { createSearchText } from "../src/lib/arabicSearch";
import { normalizeEmail } from "../src/lib/security";
import User from "../src/models/User";
import Party from "../src/models/Party";
import Post from "../src/models/Post";
import Poll from "../src/models/Poll";
import Comment from "../src/models/Comment";
import Report from "../src/models/Report";
import AuditLog from "../src/models/AuditLog";
import Law from "../src/models/Law";
import PollVote from "../src/models/PollVote";
import AuthorityProfile from "../src/models/AuthorityProfile";
import { recalculateCounters } from "./recalculate-counters";
import { demoLawCards } from "./demo-data";
import jordanProfiles from "./sharek-jordan-parties-and-iec-profiles.json";

const adminPassword = "AdminDemo!2026";
const iecPassword = "IecDemo!2026";
const citizenPassword = "CitizenDemo!2026";
const partyPassword = "PartyDemo!2026";

const placeholderPartySlugs = [
  "civil-renaissance",
  "green-development",
  "national-future",
  "youth-reform",
  "social-justice"
];

type JordanPartySeed = (typeof jordanProfiles.parties)[number];

function compactSearchValues(values: unknown[]): string[] {
  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return compactSearchValues(value);
      if (value && typeof value === "object") return compactSearchValues(Object.values(value));
      return typeof value === "string" ? [value] : [];
    })
    .filter(Boolean);
}

function buildPartySearchText(party: JordanPartySeed) {
  return createSearchText(
    compactSearchValues([
      party.name,
      party.shortDescription,
      party.description,
      party.vision,
      party.goals,
      party.officialRegistry,
      party.contact,
      party.socialLinks,
      party.statistics,
      party.committees,
      party.latestAchievements
    ])
  );
}

async function archivePlaceholderParties() {
  const placeholders = await Party.find({ slug: { $in: placeholderPartySlugs } }).select("_id slug").lean();
  if (placeholders.length === 0) return;

  const placeholderIds = placeholders.map((party) => party._id);
  await Promise.all([
    Party.updateMany({ slug: { $in: placeholderPartySlugs } }, { $set: { status: "archived" } }),
    Post.updateMany({ partyId: { $in: placeholderIds }, authorType: "party" }, { $set: { status: "hidden" } }),
    Poll.updateMany({ partyId: { $in: placeholderIds }, authorType: "party" }, { $set: { status: "hidden" } })
  ]);
}

function partySeedUpdate(party: JordanPartySeed) {
  return {
    name: party.name,
    slug: party.slug,
    shortDescription: party.shortDescription,
    description: party.description,
    foundedYear: party.foundedYear,
    vision: party.vision,
    goals: party.goals,
    socialLinks: party.socialLinks,
    officialRegistry: party.officialRegistry,
    contact: party.contact,
    committees: party.committees,
    statistics: party.statistics,
    latestAchievements: party.latestAchievements,
    dataQuality: party.dataQuality,
    contactEmail: party.contact?.email || null,
    status: party.status,
    isVerified: party.isVerified,
    searchNormalized: buildPartySearchText(party)
  };
}

async function upsertUser(email: string, role: string, name: string, password: string) {
  const emailNormalized = normalizeEmail(email);
  let user = await User.findOne({ emailNormalized });
  if (!user) {
    user = await User.create({
      name,
      email,
      emailNormalized,
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      provider: "credentials",
      status: "active",
      language: "ar"
    });
  }
  return user;
}

async function main() {
  await connectToDatabase();

  const superAdmin = await upsertUser("admin@sharek.demo", "super_admin", "مدير نشمي", adminPassword);
  const iec = await upsertUser("iec@sharek.demo", "iec", "الهيئة المستقلة", iecPassword);
  const citizen = await upsertUser("citizen@sharek.demo", "citizen", "مواطن تجريبي", citizenPassword);

  await archivePlaceholderParties();

  // Upsert parties and create linked party accounts
  for (const partyData of jordanProfiles.parties) {
    const partyUser = await upsertUser(`party.${partyData.slug}@sharek.demo`, "party", `${partyData.name} - حساب تجريبي`, partyPassword);
    await Party.findOneAndUpdate(
      { slug: partyData.slug },
      {
        $set: {
          ...partySeedUpdate(partyData),
          accountUserId: partyUser._id
        },
        $setOnInsert: {
          createdByAdminId: superAdmin._id,
          followersCount: 0,
          postsCount: 0,
          pollsCount: 0
        }
      },
      { upsert: true, new: true }
    );
  }

  const lawDocs = [];
  for (const demoLaw of demoLawCards) {
    const law = await Law.findOneAndUpdate(
      { slug: demoLaw.slug },
      {
        $set: {
          title: demoLaw.title,
          category: demoLaw.category,
          sourceName: demoLaw.sourceName,
          sourceType: demoLaw.sourceType,
          articleNumber: demoLaw.articleNumber,
          officialReferenceUrl: demoLaw.officialReferenceUrl,
          originalText: demoLaw.originalText,
          shortDescription: demoLaw.shortDescription,
          simplifiedExplanation: demoLaw.simplifiedExplanation,
          practicalExample: demoLaw.practicalExample,
          youtubeVideoId: demoLaw.youtubeVideoId,
          thumbnailUrl: demoLaw.thumbnailUrl,
          tags: demoLaw.tags,
          updatedByUserId: iec._id,
          reviewedByUserId: iec._id,
          lastVerifiedAt: new Date(),
          status: demoLaw.status,
          searchNormalized: createSearchText([
            demoLaw.title,
            demoLaw.category,
            demoLaw.shortDescription,
            demoLaw.simplifiedExplanation,
            demoLaw.originalText,
            ...(demoLaw.tags || [])
          ])
        },
        $setOnInsert: {
          slug: demoLaw.slug,
          createdByUserId: iec._id,
          viewsCount: 0,
          askedChatbotCount: 0
        }
      },
      { upsert: true, new: true }
    );
    lawDocs.push(law);
  }

  const posts = [];
  const postSeeds = [
    {
      title: "دعوة للمشاركة المدنية المسؤولة",
      content: "ندعو المواطنين إلى التحقق من المعلومات الرسمية قبل نشرها أو المشاركة بها، وأن يكون الحوار عبر وسائل التواصل مسؤولاً ومفتوحاً للجميع.",
      tags: ["مشاركة", "وعي", "الانتخابات"]
    },
    {
      title: "هل تعرف حقوقك الانتخابية؟",
      content: "اطلع على آليات التسجيل والتصويت، وتأكد من بياناتك في جداول الناخبين قبل يوم الاقتراع.",
      tags: ["حقوق", "انتخاب", "دستور"]
    },
    {
      title: "كيف نميّز المعلومة الصحيحة؟",
      content: "راجع المصدر الرسمي وتأكد من صحة الخبر قبل إعادة نشره؛ المرأة والشباب لهم دور في نشر ثقافة الحريات المدنية بوعي.",
      tags: ["معلومات", "توعية", "مصداقية"]
    },
    {
      title: "التواصل المسؤول مع الأحزاب والمؤسسات",
      content: "شارك في الحوار الوطني عبر المنصات الرسمية، واطلب من الأحزاب شرح برامجها بشكل واضح.",
      tags: ["حوار", "أحزاب", "مسؤولية"]
    }
  ];
  for (let index = 0; index < postSeeds.length; index += 1) {
    const seed = postSeeds[index];
    let post = await Post.findOne({ title: seed.title, authorType: "iec" });
    if (!post) {
      post = await Post.create({
        authorType: "iec",
        authorUserId: iec._id,
        partyId: null,
        title: seed.title,
        content: seed.content,
        mediaIds: [],
        tags: seed.tags,
        status: "published",
        publishedAt: new Date(Date.now() - index * 3600_000),
        searchNormalized: createSearchText([seed.title, seed.content, ...seed.tags])
      });
    }
    posts.push(post);
  }

  const pollSeeds = [
    {
      question: "ما هو أهم موضوع يجب أن تتعامل معه المنصة الآن؟",
      description: "شارك برأيك لنتأكد أن المحتوى الوطني يلامس احتياجات المواطنين.",
      options: ["التوعية الانتخابية", "حقوق المواطنة", "الشفافية الحكومية"]
    },
    {
      question: "ما هي أفضل وسيلة لتلقي معلومات الهيئة؟",
      description: "اختيارك يساعد في تطوير أساليب النشر للمحتوى العام.",
      options: ["مقالات قصيرة", "رسوم توضيحية", "فيديوهات تعليمية"]
    }
  ];
  const polls = [];
  for (let index = 0; index < pollSeeds.length; index += 1) {
    const pollSeed = pollSeeds[index];
    let poll = await Poll.findOne({ question: pollSeed.question, authorType: "iec" });
    if (!poll) {
      poll = await Poll.create({
        authorType: "iec",
        authorUserId: iec._id,
        partyId: null,
        question: pollSeed.question,
        description: pollSeed.description,
        options: pollSeed.options.map((text) => ({ text, votesCount: 0 })),
        pollType: "single_choice",
        allowedVoterRoles: ["citizen"],
        resultsVisibility: "always",
        allowVoteChange: false,
        status: "active",
        publishedAt: new Date(Date.now() - index * 7200_000),
        searchNormalized: createSearchText([pollSeed.question, pollSeed.description, ...pollSeed.options])
      });
    }
    polls.push(poll);
  }

  for (let index = 0; index < 8; index += 1) {
    const targetPost = posts[index % posts.length];
    const content = [`شكراً للمبادرة، من المهم أن يعرف الجميع كيف يميز بين المصدر الرسمي والمحتوى المزيف.`, `لا بد من تثقيف الشباب حول واجبهم الانتخابي قبل الاقتراع.`, `هذه المنصة يمكن أن تكون نافذة جيدة لحوار بناء بين المواطنين والأحزاب.`, `هل هناك خطة لعرض معلومات عن مواعيد الدوائر الانتخابية؟`, `أحب أن يكون هناك شرح مبسط عن كيفية المشاركة في الانتخابات.`][index % 5];
    const exists = await Comment.findOne({ targetType: "post", targetId: targetPost._id, content });
    if (!exists) {
      await Comment.create({
        targetType: "post",
        targetId: targetPost._id,
        authorUserId: citizen._id,
        authorRoleSnapshot: "citizen",
        partyId: null,
        content,
        status: "published"
      });
    }
  }

  for (let index = 0; index < polls.length; index += 1) {
    const poll = polls[index];
    const option = poll.options[0];
    await PollVote.updateOne({ pollId: poll._id, userId: citizen._id }, { $setOnInsert: { pollId: poll._id, userId: citizen._id, optionId: option._id } }, { upsert: true });
  }

  const reportTargets = [
    ["post", posts[0]._id],
    ["post", posts[1]._id],
    ["poll", polls[0]._id],
    ["comment", (await Comment.findOne({}).sort({ createdAt: 1 }))!._id]
  ] as const;
  for (let index = 0; index < reportTargets.length; index += 1) {
    const [targetType, targetId] = reportTargets[index];
    const exists = await Report.findOne({ targetType, targetId, reporterUserId: citizen._id });
    if (!exists) {
      await Report.create({
        targetType,
        targetId,
        reporterUserId: citizen._id,
        reason: index % 2 === 0 ? "misinformation" : "other",
        details: "تقرير تجريبي لاختبار سير عمل الإشراف.",
        status: "open"
      });
    }
  }

  const auditExists = await AuditLog.findOne({ action: "seed.demo" });
  if (!auditExists) {
    await AuditLog.create({
      actorUserId: superAdmin._id,
      actorRole: "super_admin",
      action: "seed.demo",
      targetType: "system",
      targetId: null,
      metadata: { users: 10, parties: jordanProfiles.parties.length, laws: lawDocs.length },
      ipHash: null,
      userAgentHash: null
    });
  }

  const authorityProfileSeed = jordanProfiles.authorityProfile;
  await AuthorityProfile.findOneAndUpdate(
    { slug: authorityProfileSeed.slug },
    {
      $set: {
        name: authorityProfileSeed.name,
        slug: authorityProfileSeed.slug,
        shortDescription: authorityProfileSeed.shortDescription,
        description: authorityProfileSeed.description,
        establishedYear: authorityProfileSeed.establishedYear,
        vision: authorityProfileSeed.vision,
        mission: authorityProfileSeed.mission,
        goals: authorityProfileSeed.goals,
        contact: authorityProfileSeed.contact,
        socialLinks: authorityProfileSeed.socialLinks,
        officialLinks: authorityProfileSeed.officialLinks,
        statistics: authorityProfileSeed.statistics,
        source: authorityProfileSeed.source,
        status: "active"
      }
    },
    { upsert: true, new: true }
  );

  await recalculateCounters();
  console.log("Seed completed");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect();
  process.exit(1);
});
