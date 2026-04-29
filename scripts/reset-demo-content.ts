import { loadEnv } from "./env";
import { connectToDatabase, mongoose } from "../src/lib/db";
import { createSearchText } from "../src/lib/arabicSearch";
import Comment from "../src/models/Comment";
import Party from "../src/models/Party";
import Poll from "../src/models/Poll";
import Post from "../src/models/Post";
import PostReaction from "../src/models/PostReaction";
import PollReaction from "../src/models/PollReaction";
import PollVote from "../src/models/PollVote";
import Report from "../src/models/Report";
import User from "../src/models/User";
import { recalculateCounters } from "./recalculate-counters";

loadEnv();

const englishRegex = /[A-Za-z]/;
const placeholderPartySlugs = ["civil-renaissance", "green-development", "national-future", "youth-reform", "social-justice"];

async function removeOldEnglishContent() {
  const [postCandidates, pollCandidates, commentCandidates] = await Promise.all([
    Post.find({ $or: [{ title: englishRegex }, { content: englishRegex }] }).lean(),
    Poll.find({ $or: [{ question: englishRegex }, { description: englishRegex }] }).lean(),
    Comment.find({ content: englishRegex }).lean()
  ]);

  const postIds = postCandidates.map((item) => item._id);
  const pollIds = pollCandidates.map((item) => item._id);
  const commentIds = commentCandidates.map((item) => item._id);

  console.log(`Removing ${postIds.length} legacy English posts, ${pollIds.length} legacy English polls, ${commentIds.length} legacy English comments.`);

  await Promise.all([
    PostReaction.deleteMany({ postId: { $in: postIds } }),
    PollReaction.deleteMany({ pollId: { $in: pollIds } }),
    PollVote.deleteMany({ pollId: { $in: pollIds } }),
    Report.deleteMany({ targetId: { $in: [...postIds, ...pollIds, ...commentIds] } }),
    Comment.deleteMany({ $or: [{ _id: { $in: commentIds } }, { targetId: { $in: [...postIds, ...pollIds] } }] }),
    Poll.deleteMany({ _id: { $in: pollIds } }),
    Post.deleteMany({ _id: { $in: postIds } })
  ]);

  const placeholderParties = await Party.find({ slug: { $in: placeholderPartySlugs } }).select("_id accountUserId").lean();
  const placeholderPartyIds = placeholderParties.map((party) => party._id);
  const placeholderAccountIds = placeholderParties.map((party) => party.accountUserId).filter(Boolean);
  if (placeholderPartyIds.length > 0) {
    await Promise.all([
      Party.updateMany({ _id: { $in: placeholderPartyIds } }, { $set: { status: "archived" } }),
      Post.updateMany({ partyId: { $in: placeholderPartyIds }, status: { $ne: "deleted" } }, { $set: { status: "hidden" } }),
      Poll.updateMany({ partyId: { $in: placeholderPartyIds }, status: { $ne: "deleted" } }, { $set: { status: "hidden" } }),
      User.updateMany({ _id: { $in: placeholderAccountIds }, role: "party" }, { $set: { status: "disabled" } })
    ]);
    console.log(`Archived ${placeholderPartyIds.length} placeholder parties, disabled their party accounts, and hidden their posts/polls.`);
  }
}

async function seedArabicDemoContent() {
  const iecAdmin = await User.findOne({ role: "iec", email: "iec@sharek.demo" });
  const now = Date.now();

  if (!iecAdmin) {
    console.warn("Unable to find IEC account user for seeding. Skipping IEC demo content.");
    return;
  }

  const iecUserId = iecAdmin._id;

  const partyPostTemplates = [
    {
      title: (partyName: string) => `رسالة ${partyName} عن المشاركة المدنية`,
      content: (partyName: string) => `يدعو ${partyName} المواطنين إلى الحوار البنّاء واحترام الآراء المختلفة، مع التركيز على الحقائق الرسمية والمشاركة الإيجابية في الفضاء العام.`,
      tags: ["مشاركة", "حوار", "توعية"]
    },
    {
      title: (partyName: string) => `كيف يدعم ${partyName} الشباب في الحياة العامة؟`,
      content: (partyName: string) => `يتحدث ${partyName} عن دور الشباب في صنع القرار وضرورة دعم الوعي المدني قبل الاقتراع.`,
      tags: ["شباب", "مواطنة", "سياسة"]
    },
    {
      title: (partyName: string) => `رؤية ${partyName} لحقوق المواطن والمشاركة السياسية`,
      content: (partyName: string) => `يشارك ${partyName} رؤيته حول حقوق المواطنين في المشاركة السياسية وضرورة متابعة المعلومات من المصادر الرسمية.`,
      tags: ["حقوق", "انتخاب", "دستور"]
    }
  ];

  const partyPollTemplate = {
    question: (partyName: string) => `ما هو أهم موضوع يجب أن يركز عليه ${partyName} في برنامج المشاركة؟`, 
    description: (partyName: string) => `شارك رأيك في أولويات ${partyName} لإشراك المواطنين في الحوار العام.`, 
    options: ["التوعية الانتخابية", "حقوق المواطنة", "الشفافية والمساءلة"]
  };

  const iecPostSeeds = [
    {
      title: "دعوة للمشاركة المدنية المسؤولية",
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
    }
  ];

  for (let index = 0; index < iecPostSeeds.length; index += 1) {
    const seed = iecPostSeeds[index];
    const existing = await Post.findOne({ title: seed.title, authorType: "iec" });
    if (!existing) {
      await Post.create({
        authorType: "iec",
        authorUserId: iecUserId,
        partyId: null,
        title: seed.title,
        content: seed.content,
        mediaIds: [],
        tags: seed.tags,
        status: "published",
        publishedAt: new Date(now - index * 90 * 60 * 1000),
        searchNormalized: createSearchText([seed.title, seed.content, ...seed.tags])
      });
    }
  }

  const activeParties = await Party.find({ status: "active", accountUserId: { $ne: null } }).lean();
  for (const party of activeParties) {
    const partyName = party.name;
    const authorUserId = party.accountUserId;
    if (!authorUserId) continue;

    for (let postIndex = 0; postIndex < partyPostTemplates.length; postIndex += 1) {
      const seed = partyPostTemplates[postIndex];
      const title = seed.title(partyName);
      const existing = await Post.findOne({ title, authorType: "party", partyId: party._id });
      const content = seed.content(partyName);
      if (!existing) {
        await Post.create({
          authorType: "party",
          authorUserId,
          partyId: party._id,
          title,
          content,
          mediaIds: [],
          tags: seed.tags,
          status: "published",
          publishedAt: new Date(now - postIndex * 60 * 60 * 1000),
          searchNormalized: createSearchText([title, content, ...seed.tags])
        });
      } else if (existing.status !== "published") {
        await Post.updateOne(
          { _id: existing._id },
          {
            $set: {
              authorUserId,
              content,
              tags: seed.tags,
              status: "published",
              deletedAt: null,
              deletedBy: null,
              moderationReason: null,
              searchNormalized: createSearchText([title, content, ...seed.tags])
            }
          }
        );
      }
    }

    const pollQuestion = partyPollTemplate.question(partyName);
    const existingPoll = await Poll.findOne({ question: pollQuestion, authorType: "party", partyId: party._id });
    if (!existingPoll) {
      await Poll.create({
        authorType: "party",
        authorUserId,
        partyId: party._id,
        question: pollQuestion,
        description: partyPollTemplate.description(partyName),
        options: partyPollTemplate.options.map((text) => ({ text, votesCount: 0 })),
        pollType: "single_choice",
        allowedVoterRoles: ["citizen"],
        resultsVisibility: "always",
        allowVoteChange: false,
        status: "active",
        publishedAt: new Date(now - 2 * 60 * 60 * 1000),
        searchNormalized: createSearchText([pollQuestion, partyPollTemplate.description(partyName), ...partyPollTemplate.options])
      });
    } else if (existingPoll.status !== "active") {
      await Poll.updateOne(
        { _id: existingPoll._id },
        {
          $set: {
            authorUserId,
            description: partyPollTemplate.description(partyName),
            status: "active",
            searchNormalized: createSearchText([pollQuestion, partyPollTemplate.description(partyName), ...partyPollTemplate.options])
          }
        }
      );
    }
  }

  const pollSeeds = [
    {
      question: "ما هو أهم موضوع يجب أن تدعمه المنصة؟",
      description: "استطلع رأيك للتركيز على المواضيع الوطنية الأهم.",
      options: ["التوعية الانتخابية", "حقوق المواطنة", "الشفافية الحكومية"]
    },
    {
      question: "كيف تفضل أن تقدم الهيئة المعلومات؟",
      description: "اختيارك يساعد في تحسين طريقة نشر الأخبار والمحتوى التعليمي.",
      options: ["مقالات قصيرة", "رسوم توضيحية", "فيديوهات تعليمية"]
    }
  ];

  for (let index = 0; index < pollSeeds.length; index += 1) {
    const seed = pollSeeds[index];
    const existing = await Poll.findOne({ question: seed.question, authorType: "iec" });
    if (!existing) {
      await Poll.create({
        authorType: "iec",
        authorUserId: iecUserId,
        partyId: null,
        question: seed.question,
        description: seed.description,
        options: seed.options.map((text) => ({ text, votesCount: 0 })),
        pollType: "single_choice",
        allowedVoterRoles: ["citizen"],
        resultsVisibility: "always",
        allowVoteChange: false,
        status: "active",
        publishedAt: new Date(now - index * 180 * 60 * 1000),
        searchNormalized: createSearchText([seed.question, seed.description, ...seed.options])
      });
    }
  }

  const posts = await Post.find({ authorType: "iec", title: { $in: iecPostSeeds.map((item) => item.title) } }).lean();
  const firstPost = posts[0];
  if (firstPost) {
    const comments = [
      "شكراً للمبادرة، من المهم أن يعرف الجميع كيف يميز بين المصدر الرسمي والمحتوى المزيف.",
      "لا بد من تثقيف الشباب حول واجبهم الانتخابي قبل الاقتراع.",
      "هذه المنصة يمكن أن تكون نافذة جيدة لحوار بناء بين المواطنين والأحزاب.",
      "هل هناك خطة لعرض معلومات عن مواعيد الدوائر الانتخابية؟"
    ];
    for (const content of comments) {
      const exists = await Comment.findOne({ targetType: "post", targetId: firstPost._id, content });
      if (!exists) {
        await Comment.create({
          targetType: "post",
          targetId: firstPost._id,
          authorUserId: iecUserId,
          authorRoleSnapshot: "iec",
          partyId: null,
          content,
          status: "published"
        });
      }
    }
  }

  const commentTarget = await Comment.findOne({ targetType: "post" }).lean();
  if (commentTarget) {
    const existingReport = await Report.findOne({ targetType: "comment", targetId: commentTarget._id });
    if (!existingReport) {
      await Report.create({
        targetType: "comment",
        targetId: commentTarget._id,
        reporterUserId: iecUserId,
        reason: "other",
        details: "تقرير تجريبي لاختبار سير عمل الإشراف.",
        status: "open"
      });
    }
  }
}

async function main() {
  await connectToDatabase();

  await removeOldEnglishContent();
  await seedArabicDemoContent();
  await recalculateCounters();

  console.log("Demo content reset completed.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
