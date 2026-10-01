import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User";
import Party from "../src/models/Party";
import Post from "../src/models/Post";
import Comment from "../src/models/Comment";
import Poll from "../src/models/Poll";
import Survey from "../src/models/Survey";
import Law from "../src/models/Law";
import AuthorityProfile from "../src/models/AuthorityProfile";
import { createSearchText } from "../src/lib/arabicSearch";
import { seedSocialFixtures } from "./ux-social-fixtures";

// No dotenv: this harness deliberately never loads the user's environment files.
async function main() {
  if (existsSync(".env") || existsSync(".env.local")) throw new Error("Run QA in a worktree without .env or .env.local");
  const db = await MongoMemoryReplSet.create({ replSet: { ip: "127.0.0.1", count: 1, storageEngine: "wiredTiger" } });
  const uri = db.getUri("nashmi_ux_qa");
  if (!uri.startsWith("mongodb://127.0.0.1:")) throw new Error("QA database must be local");
  await mongoose.connect(uri);
  const password = "Nashmi-QA-2026!Only";
  const passwordHash = await bcrypt.hash(password, 12);
  const actors = Object.fromEntries(await Promise.all(["citizen", "party", "iec", "admin", "super_admin"].map(async role => {
    const actor = await User.create({ name: `اختبار ${role}`, email: `${role}@nashmi.test`, emailNormalized: `${role}@nashmi.test`, emailVerified: true, passwordHash, role, status: "active" });
    return [role, actor];
  })));
  await User.create({ name: "اختبار كلمة مرور سابقة", email: "legacy@nashmi.test", emailNormalized: "legacy@nashmi.test", emailVerified: true, passwordHash: await bcrypt.hash("legacy-pass", 12), role: "citizen", status: "active" });
  const party = await Party.create({ name: "جهة مدنية تجريبية", slug: "qa-civic", shortDescription: "بيانات محلية للاختبار فقط، دون توصية سياسية.", description: "مساحة محايدة لعرض بيانات الاختبار والمشاركة المسؤولة.", vision: "إتاحة المعلومة بوضوح وحياد", goals: ["التوعية", "الحوار"], accountUserId: actors.party._id, createdByAdminId: actors.super_admin._id, status: "active", isVerified: true, searchNormalized: createSearchText(["جهة مدنية تجريبية"]) });
  await AuthorityProfile.create({ name: "الهيئة المستقلة للانتخاب", slug: "independent-election-commission", shortDescription: "ملف تجريبي محلي", description: "بيانات اصطناعية للتحقق من واجهة الهيئة.", status: "active" });
  const referenceTime = new Date("2026-10-01T00:00:00Z").getTime();
  const posts = await Post.insertMany(Array.from({ length: 26 }, (_, i) => ({ authorType: i % 3 === 0 ? "iec" : "party", authorUserId: i % 3 === 0 ? actors.iec._id : actors.party._id, partyId: i % 3 === 0 ? null : party._id, title: `تحديث مدني تجريبي ${i + 1}`, content: i === 0 ? "هذه مساحة للقراءة والحوار المسؤول. ".repeat(25) : "معلومة محايدة للاختبار حول المشاركة المدنية والخدمات العامة. #مشاركة", tags: ["مشاركة"], publishedAt: new Date(referenceTime - i * 60_000), status: "published", commentsCount: i === 0 ? 5 : 0, searchNormalized: createSearchText([`تحديث مدني تجريبي ${i + 1}`, "مشاركة خدمات"]) })));
  await Comment.insertMany(Array.from({ length: 5 }, (_, i) => ({ targetType: "post", targetId: posts[0]._id, authorUserId: actors.citizen._id, authorRoleSnapshot: "citizen", content: `تعليق محلي تجريبي ${i + 1}`, status: "published" })));
  await Poll.create({ authorType: "party", authorUserId: actors.party._id, partyId: party._id, question: "أي موضوع ترغب في فهمه أكثر؟", description: "تصويت اختبار محلي", options: [{ text: "التعليم" }, { text: "الخدمات" }], endsAt: new Date("2027-01-01"), status: "active", publishedAt: new Date(referenceTime - 90_000) });
  await Survey.create({ title: "استبيان مدني تجريبي", slug: "qa-survey", description: "استبيان محلي للاختبار", authorType: "party", authorUserId: actors.party._id, partyId: party._id, status: "published", publishedAt: new Date(referenceTime - 150_000), endsAt: new Date("2027-01-01"), questions: [{ title: "ما رأيك بوضوح المعلومات؟", type: "RATING", required: true, order: 0 }] });
  await Law.create({ title: "مادة قانونية تجريبية", slug: "qa-law", category: "الأحزاب", sourceName: "اختبار محلي", sourceType: "official", shortDescription: "بيانات عرض اصطناعية", simplifiedExplanation: "شرح لا يمثل استشارة قانونية ويستخدم لاختبار الواجهة فقط.", createdByUserId: actors.iec._id, status: "published" });
  const previewPostId = process.argv.includes("--social") ? await seedSocialFixtures(party._id, actors.party._id, passwordHash) : posts[0]._id;
  await mongoose.disconnect();
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/qa-fixtures.json", JSON.stringify({ citizenId: String(actors.citizen._id), partySlug: party.slug, postId: String(previewPostId), password }, null, 2));
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.argv.includes("--production") || process.argv.includes("--build") ? "production" : "development" };
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "COMSPEC", "ComSpec", "PATHEXT"]) if (process.env[key]) env[key] = process.env[key];
  Object.assign(env, { MONGODB_URI: uri, JWT_SECRET: randomBytes(48).toString("hex"), RATE_LIMIT_SECRET: randomBytes(48).toString("hex"), NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3020", APP_URL: "http://127.0.0.1:3020", NEXT_TELEMETRY_DISABLED: "1", NEWS_AUTO_PUBLISH: "false", MONGODB_SERVER_SELECTION_TIMEOUT_MS: "3000" });
  writeFileSync("test-results/qa-runtime.json", JSON.stringify(env, null, 2));
  const production = process.argv.includes("--production") || process.argv.includes("--build");
  if (process.argv.includes("--build")) {
    writeFileSync("test-results/qa-runtime.json", JSON.stringify(env, null, 2));
    const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
    const code = await new Promise<number | null>(resolve => build.once("exit", resolve));
    if (code !== 0) { await db.stop(); throw new Error("Local QA production build failed"); }
  }
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", production ? "start" : "dev", "--hostname", "127.0.0.1", "--port", "3020"], { env, stdio: "inherit" });
  console.log("QA fixtures ready: loopback-only database; synthetic test accounts; http://127.0.0.1:3020");
  async function stop() { child.kill(); await db.stop(); }
  process.once("SIGINT", () => { void stop().then(() => process.exit(0)); });
  process.once("SIGTERM", () => { void stop().then(() => process.exit(0)); });
  child.once("exit", code => { void db.stop().then(() => process.exit(code || 0)); });
}
void main().catch(error => { console.error(error); process.exit(1); });
