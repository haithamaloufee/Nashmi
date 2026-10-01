import mongoose from "mongoose";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import MediaAsset from "../src/models/MediaAsset";
import Post from "../src/models/Post";
import PostReaction from "../src/models/PostReaction";
import Comment from "../src/models/Comment";
import Poll from "../src/models/Poll";
import Survey from "../src/models/Survey";
import User from "../src/models/User";
import Party from "../src/models/Party";
import AuthorityProfile from "../src/models/AuthorityProfile";
import { createSearchText } from "../src/lib/arabicSearch";

// Called only by the isolated QA harness, never by scripts/seed.ts.
export async function seedSocialFixtures(partyId: mongoose.Types.ObjectId, authorUserId: mongoose.Types.ObjectId, passwordHash: string) {
  if (mongoose.connection.host !== "127.0.0.1" || mongoose.connection.name !== "nashmi_ux_qa") throw Error("Rich fixtures require loopback QA database");
  const source = JSON.parse(readFileSync("test-results/phase2/media-verified.json", "utf8"));
  const name = "حساب نشمي التجريبي";
  const logoUrl = "/images/nashmi logo_transparent.png";
  await Party.updateOne({ _id: partyId }, { name, isVerified: false, logoUrl, coverUrl: "/uploads/qa-social/amman.jpg", searchNormalized: createSearchText([name]) });
  await AuthorityProfile.updateOne({ slug: "independent-election-commission" }, { name: "هيئة الاختبار المحلية — بيانات اصطناعية", logoUrl });
  const media = new Map<string, mongoose.Types.ObjectId>();
  for (const asset of source.assets) {
    const bytes = readFileSync(`public/uploads/qa-social/${asset.file}`);
    if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw Error("QA media checksum mismatch");
    const stored = await MediaAsset.create({ ownerUserId: authorUserId, url: `/uploads/qa-social/${asset.file}`, storageKey: `qa-social/${asset.file}`, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, sha256: asset.sha256, width: asset.width, height: asset.height, type: asset.type, purpose: "post", resourceType: "post", visibility: "public", provider: "local_dev", status: "active", sourceProvider: "pexels", sourceUrl: asset.page });
    media.set(asset.file, stored._id);
  }
  const timestamp = Date.parse("2026-10-01T10:00:00Z");
  const publishedAt = (order: number) => new Date(timestamp - order * 60_000);
  const disclaimer = "\n\nمحتوى QA اصطناعي، وليس خبرًا أو إعلانًا حقيقيًا.";
  const definitions = [
    { order: 0, kind: "single-photo", content: "من تفاصيل عمّان اليومية تبدأ الأفكار الصغيرة: مكان مريح للمشي، مساحة للقراءة، وخدمة أوضح للجميع. أي تحسين بسيط تودّ رؤيته في حيّك؟\nصورة توضيحية مرخصة: AXP Photography / Pexels.", files: ["amman.jpg"] },
    { order: 1, kind: "short-text", content: "المعلومة الواضحة بداية مشاركة واعية. نجرّب اليوم مساحة حوار تستمع لكل الآراء باحترام. #مشاركة", files: [] },
    { order: 2, kind: "two-photos", content: "المدينة كما نراها من زاويتين. ما الذي يجعل الأماكن العامة سهلة الوصول ومريحة للناس؟\nصور توضيحية: AXP Photography / Pexels.", files: ["amman.jpg", "citadel.jpg"] },
    { order: 4, kind: "video", content: "استراحة قصيرة من التمرير 🌿\nلقطة طبيعة توضيحية مرخصة من Kaboompics / Pexels، وليست تصويرًا لنشاط أو موقع أردني.", files: ["forest.mp4"] },
    { order: 6, kind: "gallery", content: "جولة مصوّرة توضيحية: مشهد من عمّان، معلم تاريخي، ومساحة كتب. اضغط الصورة لتراها كاملة.\nالصور: AXP Photography وElement5 Digital / Pexels. صورة المكتبة لا تمثل مكتبة محلية محددة.", files: ["amman.jpg", "citadel.jpg", "library.jpg"] },
    { order: 7, kind: "long-text", content: "مساحة للحوار المدني الهادئ\n\n" + "عندما نناقش الخدمات العامة، يساعدنا وصف التجربة بوضوح: ما الذي نجح، وما الذي يمكن تحسينه، وكيف نستفيد من تجارب الآخرين؟ الحوار المسؤول يجمع الملاحظات دون أحكام مسبقة أو نسب مواقف إلى جهات حقيقية.\n\n".repeat(5), files: [] },
    { order: 8, kind: "portrait", content: "للقراءة مكان في يومنا. ما الكتاب الذي فتح لك بابًا لفهم المجتمع؟\nصورة توضيحية: Element5 Digital / Pexels. هذه ليست صورة لمكتبة محلية محددة.", files: ["library.jpg"] },
    { order: 9, kind: "expandable-text", content: "أفكار صغيرة لمشاركة أوسع\n\n" + "يمكن لكل شخص أن يشارك بفكرة محترمة، سؤال واضح، أو تجربة مفيدة. هذه فقرة اختبار طويلة لمراجعة القراءة والتوسيع على الهاتف. لا تمثل برنامجًا انتخابيًا أو خبرًا رسميًا.\n\n".repeat(8), files: [] }
  ];
  const posts: Array<{ _id: mongoose.Types.ObjectId }> = [];
  for (const item of definitions) {
    posts.push(await Post.create({ authorType: "party", authorUserId, partyId, content: item.content + disclaimer, tags: ["مشاركة"], mediaIds: item.files.map(file => media.get(file)), publishedAt: publishedAt(item.order), status: "published", searchNormalized: createSearchText([item.content, "مشاركة QA"]), commentsCount: item.order === 0 ? 5 : 0 }));
  }
  const commenters = await User.insertMany(Array.from({ length: 9 }, (_, i) => ({ name: `مشارك تجريبي ${i + 1}`, email: `social-${i + 1}@nashmi.test`, emailNormalized: `social-${i + 1}@nashmi.test`, emailVerified: true, passwordHash, role: "citizen", status: "active" })));
  await PostReaction.insertMany(commenters.map((user, i) => ({ postId: posts[0]._id, userId: user._id, type: i < 8 ? "like" : "dislike" })));
  await Post.updateOne({ _id: posts[0]._id }, { likesCount: 8, dislikesCount: 1 });
  await Comment.insertMany(["فكرة جميلة، الوصول المريح مهم للجميع.", "أحب رؤية مساحات قراءة هادئة.", "تجربة البحث واضحة على الهاتف.", "التفاصيل الصغيرة تصنع فرقًا.", "تعليق اصطناعي لمراجعة التصميم."].map((content, i) => ({ targetType: "post", targetId: posts[0]._id, authorUserId: commenters[i]._id, authorRoleSnapshot: "citizen", content, createdAt: new Date(timestamp - i * 1_000), status: "published" })));
  const poll = await Poll.create({ authorType: "party", authorUserId, partyId, question: "أي مساحة عامة تفضّل قضاء وقتك فيها؟", description: "تصويت QA اصطناعي للتصميم فقط، لا يمثل استطلاع رأي حقيقيًا.", options: [{ text: "مكتبة عامة" }, { text: "حديقة" }, { text: "مسار مشي" }, { text: "مركز ثقافي" }], endsAt: new Date("2027-01-01"), status: "active", publishedAt: publishedAt(3), searchNormalized: createSearchText(["مساحة عامة مكتبة حديقة مشاركة"]) });
  const survey = await Survey.create({ title: "كيف نجعل المعلومات المدنية أسهل؟", slug: "qa-social-survey", description: "استبيان QA من سؤالين، نتائجه تجريبية فقط.", authorType: "party", authorUserId, partyId, status: "published", publishedAt: publishedAt(5), endsAt: new Date("2027-01-01"), questions: [{ title: "ما مدى وضوح المعلومات؟", type: "RATING", required: true, order: 0 }, { title: "اقترح تحسينًا واحدًا", type: "TEXT", required: false, order: 1 }], searchNormalized: createSearchText(["معلومات مدنية مشاركة QA"]) });
  writeFileSync("test-results/phase2/social-fixtures.json", JSON.stringify({ publisher: name, entries: [...definitions.map((item, i) => ({ kind: item.kind, id: String(posts[i]._id), order: item.order })), { kind: "poll", id: String(poll._id), order: 3 }, { kind: "survey", id: String(survey._id), slug: survey.slug, order: 5 }], media: source.assets }, null, 2));
  return posts[0]._id;
}
