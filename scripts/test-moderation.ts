import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import Module from "node:module";
import mongoose, { Types } from "mongoose";
import { duplicateKey, normalizeCommentForComparison, obviousFlood, decideModeration } from "../src/lib/moderation/commentModeration";

const allow = { decision: "ALLOW", category: "NONE", confidence: 0.99, reasonCode: "SAFE" } as const;
const reject = { decision: "REJECT", category: "HARASSMENT", confidence: 0.96, reasonCode: "DIRECT_ABUSE" } as const;

function unitTests() {
  for (const content of [
    "أنا ضد هذا القرار.", "هذا القرار فاشل.", "الحزب ما قدم حلول مقنعة للشباب.",
    "الحكومة أخطأت بهذا الملف.", "ما بقتنع بهذا الكلام أبدًا.", "أنا شايف أداء المسؤول ضعيف.",
    "ma ba2tane3 bhada el 7aki", "قرار سيئ جدًا 😒", "The government got this wrong", "هَذَا   القَرَارُ فَاشِلٌ"
  ]) assert.equal(obviousFlood(content), false, content);
  assert.equal(normalizeCommentForComparison("هَــذا   القَرار!!!"), normalizeCommentForComparison("هذا القرار"));
  assert.equal(duplicateKey("u", "هَــذا القرار!", "secret"), duplicateKey("u", "هذا القرار", "secret"));
  assert.equal(obviousFlood("ههههههههههههههههههههههههههههه"), true);
  assert.equal(obviousFlood("!!!!!!!!!!"), true);
  assert.equal(decideModeration(allow).allowed, true);
  for (const category of ["HARASSMENT", "HATE", "THREAT", "INCITEMENT", "SEVERE_ABUSE"] as const) {
    assert.equal(decideModeration({ ...reject, category }).allowed, false, category);
  }
  assert.equal(decideModeration({ ...reject, confidence: 0.89 }).allowed, true);
  assert.equal(decideModeration({ ...reject, category: "NONE" }).allowed, true);
  assert.equal(decideModeration({ decision: "REJECT", category: "THREAT", confidence: "high", reasonCode: "X" }).allowed, true);
  assert.equal(decideModeration({ ...reject, extra: "injection" }).allowed, true);
}

async function integrationTests() {
  // Next replaces this marker at build time; direct tsx integration tests have no such module.
  const moduleLoader = Module as typeof Module & { _load: (name: string, ...args: unknown[]) => unknown };
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function (name, ...args) {
    return name === "server-only" ? {} : originalLoad.call(this, name, ...args);
  };
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replSet.getUri("nashmi_moderation_test");
  process.env.RATE_LIMIT_SECRET = "moderation-test-secret-32-characters-long";
  try {
    const [{ createModeratedComment, CommentRejectedError }, { connectToDatabase }, { default: Comment }, { default: Post }, { default: Poll }] = await Promise.all([
      import("../src/lib/moderation/createComment"), import("../src/lib/db"), import("../src/models/Comment"),
      import("../src/models/Post"), import("../src/models/Poll")
    ]);
    await connectToDatabase();
    await Comment.init();
    await Comment.collection.dropIndex("authorUserId_1_clientRequestId_1");
    const publisherId = new Types.ObjectId();
    const post = await Post.create({ authorType: "party", authorUserId: publisherId, content: "منشور اختبار" });
    const poll = await Poll.create({ authorType: "party", authorUserId: publisherId, question: "سؤال اختبار", options: [{ text: "نعم" }, { text: "لا" }] });
    let sequence = 0;
    function citizen() { sequence++; return { _id: new Types.ObjectId() }; }
    function input(userId: string, targetType: "post" | "poll", content: string) {
      return { userId, userRole: "citizen" as const, targetType, targetId: String(targetType === "post" ? post._id : poll._id), content, clientRequestId: randomUUID() };
    }
    const first = citizen();
    const postInput = input(String(first._id), "post", "أنا ضد هذا القرار.");
    const accepted = await createModeratedComment(postInput, async () => allow);
    assert.equal(accepted.created, true);
    assert.ok((await Comment.collection.indexes()).some((index) => index.name === "authorUserId_1_clientRequestId_1" && index.unique));
    assert.equal(accepted.comment.content, postInput.content);
    assert.equal((await Post.findById(post._id))?.commentsCount, 1);
    const retry = await createModeratedComment(postInput, async () => { throw new Error("classifier must not run on retry"); });
    assert.equal(retry.created, false);
    assert.equal(retry.comment._id, accepted.comment._id);
    assert.equal((await Post.findById(post._id))?.commentsCount, 1);

    const second = citizen();
    const pollInput = input(String(second._id), "poll", "الحكومة أخطأت بهذا الملف.");
    assert.equal((await createModeratedComment(pollInput, async () => allow)).created, true);
    assert.equal((await Poll.findById(poll._id))?.commentsCount, 1);

    const third = citizen();
    await assert.rejects(createModeratedComment(input(String(third._id), "post", "إساءة شخصية مباشرة للاختبار"), async () => reject), CommentRejectedError);
    assert.equal(await Comment.countDocuments({ authorUserId: third._id }), 0);
    assert.equal((await Post.findById(post._id))?.commentsCount, 1);

    for (const [content, category] of [
      ["أنت شخص حقير ولا قيمة لك", "HARASSMENT"],
      ["يا عديم القيمة، ابتعد عن هنا", "SEVERE_ABUSE"],
      ["هذه الفئة لا تستحق الاحترام بسبب أصلها", "HATE"],
      ["سأؤذيك غدًا", "THREAT"],
      ["اذهبوا واضربوا ذلك الشخص", "INCITEMENT"]
    ] as const) {
      const user = citizen();
      await assert.rejects(createModeratedComment(input(String(user._id), "post", content), async () => ({ ...reject, category })), CommentRejectedError);
      assert.equal(await Comment.countDocuments({ authorUserId: user._id }), 0);
    }
    assert.equal((await Post.findById(post._id))?.commentsCount, 1);

    for (const classifier of [
      async () => ({ ...reject, confidence: 0.7 }),
      async () => ({ malformed: true } as never),
      async () => { throw new Error("provider timeout"); }
    ]) {
      const user = citizen();
      await createModeratedComment(input(String(user._id), "poll", `نقد مشروع ${sequence}`), classifier);
    }
    assert.equal((await Poll.findById(poll._id))?.commentsCount, 4);

    const floodUser = citizen();
    await assert.rejects(createModeratedComment(input(String(floodUser._id), "post", "هههههههههههههههههههههههههههه"), async () => allow), CommentRejectedError);
    assert.equal(await Comment.countDocuments({ authorUserId: floodUser._id }), 0);

    const duplicateUser = citizen();
    await createModeratedComment(input(String(duplicateUser._id), "post", "هذا القرار سيئ."), async () => allow);
    await assert.rejects(createModeratedComment(input(String(duplicateUser._id), "poll", "هَذا القرار سيئ!!!"), async () => allow), CommentRejectedError);
    assert.equal(await Comment.countDocuments({ authorUserId: duplicateUser._id }), 1);
    assert.equal((await Poll.findById(poll._id))?.commentsCount, 4);

    const burstUser = citizen();
    for (let i = 0; i < 4; i++) {
      await createModeratedComment(input(String(burstUser._id), "poll", `تعليق مختلف ${i}`), async () => allow);
    }
    await assert.rejects(createModeratedComment(input(String(burstUser._id), "poll", "تعليق خامس"), async () => {
      throw new Error("classifier must not run after burst limit");
    }), /RATE_LIMITED/);
    assert.equal((await Poll.findById(poll._id))?.commentsCount, 8);

    // Exercise both HTTP POST route adapters with the shared service mocked.
    const calledTargets: string[] = [];
    let shouldReject = false;
    let mockRole = "citizen";
    moduleLoader._load = function (name, ...args) {
      if (name === "server-only") return {};
      if (name === "@/lib/auth") return { requireActiveUser: async () => ({ id: String(first._id), role: mockRole }) };
      if (name === "@/lib/audit") return { writeAuditLog: async () => undefined };
      if (name === "next/cache") return { revalidatePath: () => undefined };
      if (name === "@/lib/moderation/createComment") return {
        CommentRejectedError,
        createModeratedComment: async (args: { targetType: string }) => {
          calledTargets.push(args.targetType);
          if (shouldReject) throw new CommentRejectedError("DIRECT_ABUSE");
          return { created: true, comment: { _id: randomUUID(), content: "نقد مشروع" } };
        }
      };
      return originalLoad.call(this, name, ...args);
    };
    const [{ POST: postRoute }, { POST: pollRoute }] = await Promise.all([
      import("../src/app/api/posts/[id]/comments/route"),
      import("../src/app/api/polls/[id]/comments/route")
    ]);
    const makeRequest = () => new Request("http://localhost/comments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "نقد مشروع", clientRequestId: randomUUID() })
    });
    assert.equal((await postRoute(makeRequest(), { params: Promise.resolve({ id: String(post._id) }) })).status, 201);
    assert.equal((await pollRoute(makeRequest(), { params: Promise.resolve({ id: String(poll._id) }) })).status, 201);
    shouldReject = true;
    const rejectedRoute = await postRoute(makeRequest(), { params: Promise.resolve({ id: String(post._id) }) });
    assert.equal(rejectedRoute.status, 422);
    assert.match((await rejectedRoute.json()).error.message, /ما قدرنا ننشر التعليق/);
    assert.deepEqual(calledTargets, ["post", "poll", "post"]);
    const oversizedRequest = new Request("http://localhost/comments", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: "x".repeat(5000) })
    });
    assert.equal((await postRoute(oversizedRequest, { params: Promise.resolve({ id: String(post._id) }) })).status, 413);
    assert.deepEqual(calledTargets, ["post", "poll", "post"]);

    mockRole = "admin";
    const { PATCH: adminModerate } = await import("../src/app/api/admin/comments/[id]/route");
    const adminRequest = (action: string) => new Request("http://localhost/api/admin/comments", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason: "سبب اختبار واضح" })
    });
    const adminContext = { params: Promise.resolve({ id: accepted.comment._id }) };
    assert.equal((await adminModerate(adminRequest("hide"), adminContext)).status, 200);
    assert.equal((await Post.findById(post._id))?.commentsCount, 1); // The later duplicate-user comment remains public.
    assert.equal((await Comment.findById(accepted.comment._id))?.status, "hidden");
    assert.equal((await adminModerate(adminRequest("restore"), adminContext)).status, 200);
    assert.equal((await Post.findById(post._id))?.commentsCount, 2);
    assert.equal((await Comment.findById(accepted.comment._id))?.status, "published");

    const concurrentUser = citizen();
    const concurrentInput = input(String(concurrentUser._id), "post", "تعليق متزامن للاختبار");
    const concurrentResults = await Promise.allSettled([
      createModeratedComment(concurrentInput, async () => { await new Promise((resolve) => setTimeout(resolve, 50)); return allow; }),
      createModeratedComment(concurrentInput, async () => { await new Promise((resolve) => setTimeout(resolve, 50)); return allow; })
    ]);
    assert.equal(concurrentResults.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await Comment.countDocuments({ authorUserId: concurrentUser._id }), 1);
    assert.equal((await Post.findById(post._id))?.commentsCount, 3);

  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

unitTests();
integrationTests().then(() => {
  console.log("Comment moderation unit and MongoDB transaction integration tests passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
