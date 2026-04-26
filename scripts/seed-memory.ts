import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { formatSafeError, loadEnv } from "./env";
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
import PartyFollower from "../src/models/PartyFollower";
import PollVote from "../src/models/PollVote";
import { recalculateCounters } from "./recalculate-counters";

loadEnv();

const password = "Password123!";

async function upsertUser(email: string, role: string, name: string) {
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
  // Start in-memory MongoDB server
  console.log("Starting in-memory MongoDB server...");
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Override the MONGODB_URI environment variable
  process.env.MONGODB_URI = mongoUri;

  console.log("In-memory MongoDB started");

  await connectToDatabase();

  const superAdmin = await upsertUser("admin@sharek.demo", "super_admin", "مدير شارك");
  const iec = await upsertUser("iec@sharek.demo", "iec", "الهيئة المستقلة");
  const citizens = await Promise.all([
    upsertUser("citizen1@sharek.demo", "citizen", "مواطنة تجريبية 1"),
    upsertUser("citizen2@sharek.demo", "citizen", "مواطن تجريبي 2"),
    upsertUser("citizen3@sharek.demo", "citizen", "مواطنة تجريبية 3")
  ]);

  const partyUsers = await Promise.all(
    [1, 2, 3, 4, 5].map((index) => upsertUser(`party${index}@sharek.demo`, "party", `حساب حزب ${index}`))
  );

  const partySeeds = [
    ["حزب النهضة المدنية", "civil-renaissance", "يركز على تحديث الخدمات العامة وتعزيز المشاركة المدنية."],
    ["حزب المستقبل الوطني", "national-future", "يطرح أفكارا عامة حول التعليم والفرص الاقتصادية للشباب."],
    ["حزب العدالة المجتمعية", "social-justice", "يهتم بالعدالة الاجتماعية وسياسات الحماية والمساواة."],
    ["حزب التنمية الخضراء", "green-development", "يركز على التنمية المستدامة وحماية البيئة والاقتصاد المحلي."],
    ["حزب الشباب والإصلاح", "youth-reform", "يعرض رؤى حول تمكين الشباب وتطوير العمل العام."]
  ];

  const parties = [];
  for (let index = 0; index < partySeeds.length; index += 1) {
    const [name, slug, shortDescription] = partySeeds[index];
    let party = await Party.findOne({ slug });
    if (!party) {
      party = await Party.create({
        name,
        slug,
        shortDescription,
        description: `${shortDescription} هذا وصف تجريبي محايد لا يتضمن توصية أو دعاية، ويهدف إلى إظهار طريقة عرض معلومات الأحزاب داخل منصة شارك.`,
        foundedYear: 2024 - index,
        vision: "تعزيز المشاركة العامة المنظمة واحترام سيادة القانون وتوسيع قنوات الحوار.",
        goals: ["تطوير التواصل مع المواطنين", "نشر الوعي السياسي", "دعم مشاركة الشباب", "تقديم معلومات واضحة عن البرامج العامة"],
        socialLinks: {},
        contactEmail: `party${index + 1}@sharek.demo`,
        accountUserId: partyUsers[index]._id,
        createdByAdminId: superAdmin._id,
        status: "active",
        isVerified: true,
        searchNormalized: createSearchText([name, shortDescription, "مشاركة سياسية شباب قانون"])
      });
    } else if (!party.accountUserId) {
      party.accountUserId = partyUsers[index]._id;
      await party.save();
    }
    parties.push(party);
  }

  const laws = [
    ["حق الانتخاب", "right-to-vote", "الحقوق السياسية", "يحق للمواطن المؤهل المشاركة في اختيار ممثليه وفق شروط القانون.", "عند بلوغ السن القانوني وتحقق الشروط، يستطيع المواطن التسجيل والمشاركة في يوم الاقتراع."],
    ["حرية الرأي والتعبير", "freedom-expression", "الحقوق العامة", "حرية الرأي تعني قدرة الفرد على التعبير السلمي ضمن حدود القانون واحترام حقوق الآخرين.", "يمكن للمواطن نقد السياسات العامة دون إساءة أو تحريض."],
    ["حق تشكيل الأحزاب", "party-formation", "الأحزاب", "تشكيل الأحزاب حق منظم بالقانون بهدف المشاركة السياسية السلمية.", "مجموعة مواطنين يمكنهم اتباع المتطلبات الرسمية لتأسيس حزب."],
    ["مبدأ المساواة أمام القانون", "equality-before-law", "المبادئ الدستورية", "المساواة أمام القانون تعني تطبيق القواعد العامة دون تمييز غير مشروع.", "تتعامل الجهات الرسمية مع الطلبات وفق شروط معلنة ومتماثلة."],
    ["دور الهيئة المستقلة", "iec-role", "الانتخابات", "تدير الهيئة العملية الانتخابية وتعمل على تنظيم الإجراءات ونشر التوعية.", "تنشر الهيئة التعليمات ومواقع الاقتراع والمواد التوعوية."],
    ["آلية التصويت", "voting-process", "الانتخابات", "التصويت يمر بمراحل تحقق من الهوية واستلام الورقة والاقتراع السري ثم وضع الورقة في الصندوق.", "في مركز الاقتراع يتبع الناخب تعليمات اللجنة للحفاظ على سرية صوته."],
    ["المشاركة السياسية للشباب", "youth-political-participation", "الشباب", "مشاركة الشباب تشمل التعلم والحوار والعمل الحزبي أو المدني السلمي ضمن القانون.", "يمكن للشباب حضور جلسات توعوية وقراءة برامج الأحزاب وطرح أسئلة محايدة."],
    ["الفرق بين الانتخاب والترشح", "vote-vs-candidacy", "مفاهيم انتخابية", "الانتخاب هو اختيار مرشح أو قائمة، أما الترشح فهو التقدم للمنافسة وفق شروط محددة.", "قد يكون المواطن ناخبا فقط، أو مرشحا إذا استوفى شروط الترشح."]
  ];
  const lawDocs = [];
  for (const [title, slug, category, shortDescription, practicalExample] of laws) {
    const law = await Law.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          title,
          slug,
          category,
          sourceName: "مصدر توعوي تجريبي",
          sourceType: "مادة توعوية",
          articleNumber: null,
          officialReferenceUrl: "https://www.iec.jo/",
          originalText: null,
          shortDescription,
          simplifiedExplanation: `${shortDescription} هذا الشرح مبسط للتوعية العامة ولا يغني عن الرجوع إلى النصوص الرسمية أو الجهات المختصة.`,
          practicalExample,
          youtubeVideoId: slug === "voting-process" ? "dQw4w9WgXcQ" : null,
          thumbnailUrl: null,
          tags: [category, "انتخابات", "توعية"],
          createdByUserId: iec._id,
          reviewedByUserId: iec._id,
          lastVerifiedAt: new Date(),
          status: "published",
          searchNormalized: createSearchText([title, category, shortDescription, practicalExample])
        }
      },
      { upsert: true, new: true }
    );
    lawDocs.push(law);
  }

  const postAuthors = [...parties, ...parties, null, null, null, null];
  const posts = [];
  for (let index = 0; index < 10; index += 1) {
    const party = postAuthors[index] as any;
    const authorUser = party ? partyUsers[parties.findIndex((item) => String(item._id) === String(party._id))] : iec;
    const authorType = party ? "party" : "iec";
    const title = party ? `تحديث من ${party.name}` : `تنويه توعوي من الهيئة ${index - 5}`;
    let post = await Post.findOne({ title });
    if (!post) {
      const content = party
        ? "منشور تجريبي محايد يعرض نشاطا عاما ومعلومة تنظيمية دون دعاية أو دعوة تصويت."
        : "تؤكد الهيئة أهمية قراءة التعليمات الرسمية والتحقق من مصادر المعلومات قبل المشاركة.";
      post = await Post.create({
        authorType,
        authorUserId: authorUser._id,
        partyId: party?._id || null,
        title,
        content,
        mediaIds: [],
        tags: ["توعية", "مشاركة"],
        status: "published",
        publishedAt: new Date(Date.now() - index * 3600_000),
        searchNormalized: createSearchText([title, content, "توعية مشاركة"])
      });
    }
    posts.push(post);
  }

  const polls = [];
  for (let index = 0; index < 5; index += 1) {
    const party = parties[index];
    const question = `ما أكثر موضوع ترغب بمناقشته مع ${party.name}؟`;
    let poll = await Poll.findOne({ question });
    if (!poll) {
      poll = await Poll.create({
        authorType: "party",
        authorUserId: partyUsers[index]._id,
        partyId: party._id,
        question,
        description: "تصويت تجريبي للتفاعل العام داخل المنصة.",
        options: ["التعليم", "فرص العمل", "الخدمات العامة", "المشاركة الشبابية"].slice(0, 2 + (index % 3)).map((text) => ({ text, votesCount: 0 })),
        pollType: "single_choice",
        allowedVoterRoles: ["citizen"],
        resultsVisibility: "always",
        allowVoteChange: false,
        status: "active",
        publishedAt: new Date(Date.now() - index * 7200_000),
        searchNormalized: createSearchText([question, "تصويت تعليم فرص عمل خدمات"])
      });
    }
    polls.push(poll);
  }

  for (let index = 0; index < citizens.length; index += 1) {
    await PartyFollower.updateOne({ partyId: parties[index]._id, userId: citizens[index]._id }, { $setOnInsert: { partyId: parties[index]._id, userId: citizens[index]._id } }, { upsert: true });
  }

  for (let index = 0; index < 20; index += 1) {
    const targetPost = posts[index % posts.length];
    const content = `تعليق تجريبي رقم ${index + 1} بلغة محترمة حول أهمية المشاركة المنظمة.`;
    const exists = await Comment.findOne({ targetType: "post", targetId: targetPost._id, content });
    if (!exists) {
      await Comment.create({
        targetType: "post",
        targetId: targetPost._id,
        authorUserId: citizens[index % citizens.length]._id,
        authorRoleSnapshot: "citizen",
        partyId: targetPost.partyId,
        content,
        status: "published"
      });
    }
  }

  for (let index = 0; index < polls.length; index += 1) {
    const poll = polls[index];
    const option = poll.options[0];
    await PollVote.updateOne({ pollId: poll._id, userId: citizens[index % citizens.length]._id }, { $setOnInsert: { pollId: poll._id, userId: citizens[index % citizens.length]._id, optionId: option._id } }, { upsert: true });
  }

  const reportTargets = [
    ["post", posts[0]._id],
    ["post", posts[1]._id],
    ["poll", polls[0]._id],
    ["party", parties[0]._id],
    ["comment", (await Comment.findOne({}).sort({ createdAt: 1 }))!._id]
  ] as const;
  for (let index = 0; index < reportTargets.length; index += 1) {
    const [targetType, targetId] = reportTargets[index];
    const exists = await Report.findOne({ targetType, targetId, reporterUserId: citizens[index % citizens.length]._id });
    if (!exists) {
      await Report.create({
        targetType,
        targetId,
        reporterUserId: citizens[index % citizens.length]._id,
        reason: index % 2 === 0 ? "misinformation" : "other",
        details: "بلاغ تجريبي لعرض مسار المراجعة.",
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
      metadata: { users: 10, parties: 5, laws: lawDocs.length },
      ipHash: null,
      userAgentHash: null
    });
  }

  await recalculateCounters();
  console.log("Seed completed successfully");

  // Disconnect and stop the in-memory server
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log("In-memory MongoDB server stopped");
}

main().catch(async (error) => {
  console.error(`Seed failed: ${formatSafeError(error)}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
