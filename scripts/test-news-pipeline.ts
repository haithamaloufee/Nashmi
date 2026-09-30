import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { eventDraftsFromMaterial, sameNewsEvent } from "../src/lib/news/pipelineCore";
import { assertPipelineWriteIsolation, jordanEditorialDay, publishEventBatch, runNewsDiscovery, runNewsEditorial } from "../src/lib/news/pipeline";
import { buildActiveNewsQuery } from "../src/lib/news/query";
import { assertPreviewDatabaseRoles, verifyNewsPreviewIsolation } from "../src/lib/news/previewIsolation";
import { NEWS_SOURCES, parseGovernmentArchive, parseGovernmentDetail, parseGovernmentDetailHeadline, parseMamlakaOriginalPublication, type SourceMaterial } from "../src/lib/news/sourceRegistry";
import NewsCandidate from "../src/models/NewsCandidate";
import NewsEvent from "../src/models/NewsEvent";
import NewsItem from "../src/models/NewsItem";
import NewsRefreshState from "../src/models/NewsRefreshState";

const source = NEWS_SOURCES[0];
const now = new Date("2026-09-30T01:00:00.000Z");
const archive = `<a href='/Ar/NewsDetails/test-decision'><div class='media news-block'><p class='date'><span>29/09/2026</span></p><h5 class='card-title'>قرارات مجلس الوزراء بشأن التعليم والنقل العام</h5><p class='card-text'>أعلن مجلس الوزراء عن قرارات جديدة تتعلق بالتعليم والنقل العام في الأردن.</p></div></a>`;
const detail = `<div id='ctl00_ctl00_MainContent_ContentDetails_NewsSection'><p>وافق مجلس الوزراء على مشروع قانون جديد ينظم إجراءات القبول الجامعي في الأردن.</p><p>قرر مجلس الوزراء تعديل تعليمات النقل العام في المحافظات اعتبارا من العام المقبل.</p></div>`;

function testPureRules() {
  assert.equal(parseMamlakaOriginalPublication('<header>تاريخ الإنشاء<time><i></i>14:18:13 30 -09- 2026</time>آخر تحديث<time>15:07:03 30 -09- 2026</time></header>').toISOString(), "2026-09-30T11:18:13.000Z");
  assert.throws(() => parseMamlakaOriginalPublication('<time>15:07:03 30 -09- 2026</time>'), /UNVERIFIED/);
  assert.throws(() => parseMamlakaOriginalPublication('تاريخ الإنشاء<time>14:18:13 31 -02- 2026</time>'), /UNVERIFIED/);
  assertPreviewDatabaseRoles("nashmi_preview", [{ role: "readWrite", db: "nashmi_preview" }]);
  assert.throws(() => assertPreviewDatabaseRoles("sharek_demo", [{ role: "readWrite", db: "sharek_demo" }]), /ISOLATION_FAILED/);
  for (const roles of [undefined, [], [{ role: "readWriteAnyDatabase", db: "admin" }], [{ role: "readWrite", db: "nashmi_preview" }, { role: "readWrite", db: "sharek_demo" }], [{ role: "unreviewedCustomRole", db: "nashmi_preview" }]]) {
    assert.throws(() => assertPreviewDatabaseRoles("nashmi_preview", roles), /PERMISSIONS_UNVERIFIED/);
  }
  const parsed = parseGovernmentArchive(archive, source);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].publishedAt.toISOString(), "2026-09-28T21:00:00.000Z");
  assert.equal(parseGovernmentDetail(detail).length, 2);
  const longSection = `<div id="test_NewsSection">${Array.from({ length: 57 }, (_, index) => `<p>فقرة حكومية موثقة رقم ${index + 1} تتضمن نصاً تفصيلياً يتيح فحص نهاية البيان.</p>`).join("")}</div>`;
  assert.equal(parseGovernmentDetail(longSection).length, 57, "decisions at the end of a long Cabinet bulletin must remain visible");
  const material: SourceMaterial = { ...parsed[0], paragraphs: parseGovernmentDetail(detail) };
  const drafts = eventDraftsFromMaterial(material, now);
  assert.equal(drafts.length, 2, "one bulletin may contain two independently evidenced decisions");
  assert.ok(drafts.every((item) => item.eligible));
  assert.equal(drafts[0].actionStage, "cabinet_approved_draft");
  assert.equal(sameNewsEvent(drafts[0], drafts[1]), false, "different decisions must not merge");
  assert.equal(sameNewsEvent(drafts[0], { ...drafts[0], titleAr: drafts[0].titleAr }), true);
  const old = eventDraftsFromMaterial(material, new Date(now.getTime() + 49 * 60 * 60_000));
  assert.ok(old.every((item) => !item.eligible && item.reason === "older_than_48_hours"));
  assert.equal(material.publishedAt.toISOString(), "2026-09-28T21:00:00.000Z", "rediscovery never changes original publication time");
  const officialHeadline = "رئيس الوزراء يوجه ببدء الإجراءات اللازمة لإنشاء 6 حدائق في الزرقاء والطفيلة ومعان وجرش وعجلون ومأدبا خلال عام 2027";
  const longTitle = `${officialHeadline}، مع وصف تفصيلي طويل يتجاوز حد العنوان المخزن ويصف مواقع الحدائق ومرافقها وخطوات تخصيص الموارد اللازمة لإنشائها`;
  assert.ok(longTitle.length > 180);
  const parksDetail = `<div id="site_Devbanner"><h2>${officialHeadline}</h2></div><div id="site_NewsSection"><p>وجه رئيس الوزراء اليوم إلى البدء بالإجراءات اللازمة لإنشاء 6 حدائق في مدن الزرقاء والطفيلة ومعان وجرش وعجلون ومأدبا، على أن تنفذ جميعها خلال عام 2027.</p></div>`;
  const parksMaterial: SourceMaterial = { ...material, title: longTitle, detailHeadline: parseGovernmentDetailHeadline(parksDetail) || undefined, paragraphs: parseGovernmentDetail(parksDetail) };
  const parksDrafts = eventDraftsFromMaterial(parksMaterial, now);
  assert.equal(parksDrafts.length, 1, "a long archive title must use the exact official detail heading");
  assert.equal(parksDrafts[0].titleAr, officialHeadline);
  assert.equal(parksDrafts[0].actionStage, "directive");
  assert.equal(parksDrafts[0].eligible, true, JSON.stringify(parksDrafts[0]));
  const bulletin: SourceMaterial = {
    ...material,
    title: "مجلس الوزراء يقر قرارات مستقلة تخص التعليم والنقل والصحة",
    detailHeadline: undefined,
    paragraphs: [
      "الموافقة على إنشاء مركز خدمات حكومي جديد في مدينة معان، لخدمة المواطنين وتبسيط إجراءاتهم خلال العام المقبل.",
      "إقرار نظام جديد لتنظيم النقل العام في المحافظات، بهدف تحسين خدمات الركاب وتحديد مسؤوليات الجهات المعنية.",
      "إقرار نظامين للتنظيم الإداري لهيئة الصحة وهيئة النقل، والموافقة على الأسباب الموجبة لمشروع نظام إداري لوزارة التربية والتعليم.",
      "عمان 29 أيلول - قرر مجلس الوزراء الموافقة على إنشاء مركز خدمات حكومي جديد في مدينة معان خلال العام المقبل.",
      "ويأتي القرار ضمن خطة الحكومة لتحسين جودة الخدمات المقدمة للمواطنين في المحافظات المختلفة.",
      "على صعيد آخر، قرر مجلس الوزراء إنهاء خدمات ثلاثة من أعضاء مجلس مفوضي هيئة النقل وهم أحمد ومحمد وخالد، وذلك اعتبارا من مطلع الشهر المقبل بعد انتهاء المدة المقررة لأعمالهم."
    ]
  };
  const bulletinDrafts = eventDraftsFromMaterial(bulletin, now);
  assert.equal(bulletinDrafts.length, 5, "three official headings include four actions plus one independent body decision; duplicated body text is ignored");
  assert.equal(bulletinDrafts.filter((item) => item.actionStage === "cabinet_approved_reasons").length, 1);
  assert.ok(bulletinDrafts.some((item) => item.titleAr.includes("إنهاء خدمات ثلاثة") && !item.titleAr.endsWith("وهم")));
  assert.ok(bulletinDrafts.every((item) => item.eligible));
  const longHeadings: SourceMaterial = {
    ...bulletin,
    paragraphs: [
      "الموافقة على قرار مجلس مفوضي سلطة منطقة العقبة الاقتصادية الخاصة المتضمن منح مشروع الناقل الوطني للمياه مجموعة من التسهيلات والإعفاءات في إطار استكمال الإجراءات المتعلقة بالبدء بتنفيذ المشروع.",
      "الموافقة على زيادة المخصصات المالية المرصودة لشراء الحبوب البلدية من محصولي القمح والشعير لتصبح 59 مليون دينار بدلا من 45 مليونا وزيادة الكميات التي يتم شراؤها من المزارعين الأردنيين من 110 آلاف طن إلى 147 ألفا.",
      "حل مجلس إدارة غرف التجارة اعتبارا من تاريخ 27 أيلول الحالي وتكليف وزير الصناعة والتجارة والتموين برفع أسماء أعضاء لجان إدارة الغرف لمجلس الوزراء؛ تمهيدا لإجراء الانتخابات وفقا لأحكام التشريعات الناظمة.",
      "عمان 17 أيلول - قرر مجلس الوزراء الموافقة على قرار مجلس مفوضي سلطة منطقة العقبة الاقتصادية الخاصة المتضمن منح مشروع الناقل الوطني للمياه مجموعة من التسهيلات والإعفاءات."
    ]
  };
  const longHeadingDrafts = eventDraftsFromMaterial(longHeadings, now);
  assert.equal(longHeadingDrafts.length, 3, "long official decision headings are distinct, with duplicate body text ignored");
  assert.ok(longHeadingDrafts.every((item) => item.eligible && item.titleAr.length <= 180 && item.passage.includes(item.titleAr)));
  // Synthetic boundary fixtures, kept separate from the linked historical sample.
  const activityMaterial = (title: string, paragraph: string, publisher = "مجلس النواب"): SourceMaterial => ({ ...material, sourceId: "house", publisher, title, detailHeadline: undefined, paragraphs: [paragraph], summary: paragraph });
  const committee = eventDraftsFromMaterial(activityMaterial("اللجنة الصحية النيابية تعقد اجتماعًا مع بنك الدواء", "عقدت اللجنة الصحية في مجلس النواب اجتماعًا مع بنك الدواء في الأردن لبحث إجراءات توفير العلاج للمواطنين."), now)[0];
  assert.equal(committee.eligible, true);
  assert.equal(committee.eventKind, "parliamentary_committee");
  assert.equal(committee.actionStage, "activity_held");
  const scheduledMaterial = activityMaterial("مجلس النواب يعلن موعد جلسة مقبلة", "أعلن مجلس النواب موعد جلسة 2026/10/04 لمناقشة جدول الأعمال التشريعي والرقابي في الأردن.");
  const scheduled = eventDraftsFromMaterial(scheduledMaterial, now)[0];
  assert.equal(scheduled.eligible, true);
  assert.equal(scheduled.eventStatus, "announced");
  assert.equal(scheduled.scheduledAt?.toISOString(), "2026-10-03T21:00:00.000Z");
  assert.equal(eventDraftsFromMaterial(scheduledMaterial, new Date(now.getTime() + 49 * 60 * 60_000))[0].eligible, false, "a future appointment does not renew an old announcement");
  const postponed = eventDraftsFromMaterial(activityMaterial("مجلس النواب يعلن تأجيل الجلسة المقبلة", "أعلن مجلس النواب تأجيل موعد جلسة 2026/10/04 إلى موعد آخر يعلن لاحقًا في الأردن."), now)[0];
  assert.equal(postponed.eventStatus, "postponed");
  assert.equal(sameNewsEvent(scheduled, postponed), false);
  const royalSchedule = eventDraftsFromMaterial({ ...activityMaterial("إرادتان ملكيتان بإرجاء اجتماع مجلس الأمة ودعوته للانعقاد في 2 تشرين الثاني المقبل", "صدرت إرادتان ملكيتان بإرجاء اجتماع مجلس الأمة ودعوته للانعقاد في 2 تشرين الثاني المقبل في الأردن."), sourceId: "mamlaka", publisher: "قناة المملكة", sourceClass: "reputable_media" }, now)[0];
  assert.equal(royalSchedule.eventStatus, "postponed", "deferring Parliament is not a meeting that has already taken place");
  assert.equal(royalSchedule.eventKind, "parliamentary_schedule");
  assert.equal(royalSchedule.scheduledAt?.toISOString(), "2026-11-01T21:00:00.000Z");
  const blockedSource = eventDraftsFromMaterial({ ...scheduledMaterial, sourceId: "roya", publisher: "رؤيا الإخباري", sourceClass: "reputable_media", aiInputAllowed: false }, now)[0];
  assert.equal(blockedSource.eligible, false);
  assert.equal(blockedSource.reason, "source_ai_input_prohibited");
  const missingOriginalDate = eventDraftsFromMaterial({ ...scheduledMaterial, publicationVerified: false }, now)[0];
  assert.equal(missingOriginalDate.eligible, false);
  assert.equal(missingOriginalDate.reason, "original_publication_unverified");
  assert.equal(sameNewsEvent(scheduled, { ...scheduled, publishedAt: new Date(scheduled.publishedAt.getTime() + 5 * 24 * 60 * 60_000) }), true, "repeating the same appointment announcement does not create a new event");
  assert.equal(jordanEditorialDay(new Date("2026-09-29T21:01:00Z")), "2026-09-30");
  assert.equal(jordanEditorialDay(new Date("2026-09-29T20:59:00Z")), "2026-09-29");
  const recommended = eventDraftsFromMaterial(activityMaterial("اللجنة القانونية توصي بإقرار مشروع قانون جديد", "أوصت اللجنة القانونية في مجلس النواب بإقرار مشروع قانون جديد بعد مناقشته في اجتماع عقدته في الأردن."), now)[0];
  assert.equal(recommended.actionStage, "recommendation", "a committee recommendation is not approval by Parliament");
  const adoptedByCommittee = eventDraftsFromMaterial(activityMaterial("اللجنة القانونية تقر مشروع قانون جديد", "أقرت اللجنة القانونية في مجلس النواب مشروع قانون جديد وأوصت بإحالته إلى المجلس لمناقشته."), now)[0];
  assert.equal(adoptedByCommittee.actionStage, "committee_adopted");
  const futureLaw = eventDraftsFromMaterial({ ...material, title: "وزارة العمل تصدر تعليمات يبدأ تطبيقها لاحقًا", paragraphs: ["أعلنت وزارة العمل تعليمات جديدة سيبدأ العمل بها في العام المقبل بعد نشرها، ولن يبدأ تنفيذها قبل ذلك الموعد."], summary: "تعليمات جديدة موثقة من وزارة العمل الأردنية سيبدأ العمل بها في العام المقبل." }, now)[0];
  assert.equal(futureLaw.actionStage, "effective_scheduled", "future entry into force is not current effectiveness");
  for (const party of ["حزب ألف الأردني", "حزب باء الأردني"]) {
    const meeting = eventDraftsFromMaterial({ ...activityMaterial(`${party} يعقد اجتماعًا عامًا في عمان`, `عقد ${party} اجتماعًا عامًا في عمان لمناقشة برنامجه والمبادرات العامة بحضور أعضاء الحزب.`), sourceId: "mamlaka", sourceClass: "reputable_media", publisher: "قناة المملكة" }, now)[0];
    assert.equal(meeting.eligible, true, `${party}: political identity must not affect eligibility`);
    assert.equal(meeting.eventKind, "party_activity");
  }
  const statement = (name: string) => eventDraftsFromMaterial({ ...activityMaterial(`${name}: حزب ألف يدعو لمراجعة مشروع القانون`, `قال ${name} إن حزب ألف الأردني يدعو لمراجعة مشروع القانون في بيان رسمي في عمان.`), sourceId: "mamlaka", sourceClass: "reputable_media", publisher: "قناة المملكة" }, now)[0];
  assert.equal(statement("أحمد").actionStage, "statement");
  assert.equal(sameNewsEvent(statement("أحمد"), statement("خالد")), false, "different speakers' claims must not merge");
  assert.equal(eventDraftsFromMaterial({ ...activityMaterial("حزب مجهول يعقد اجتماعًا غير موثق", "ذكرت إشاعة من مصدر مجهول أن حزبًا عقد اجتماعًا في عمان دون مصدر موثق."), sourceId: "roya", sourceClass: "reputable_media" }, now)[0].eligible, false);
}

async function testPreviewIsolationBeforeMongoose() {
  const previousEnvironment = process.env.VERCEL_ENV;
  const previousUri = process.env.MONGODB_URI;
  const replica = await MongoMemoryReplSet.create({ replSet: {
    count: 1, storageEngine: "wiredTiger",
    auth: { enable: true, extraUsers: [
      { createUser: "restricted_preview", pwd: "local-test-password", roles: [{ role: "readWrite", db: "nashmi_preview" }] },
      { createUser: "broad_preview", pwd: "local-test-password", roles: [{ role: "readWriteAnyDatabase", db: "admin" }] }
    ] }
  } });
  const credentialUri = (username: string) => {
    const base = replica.getUri("nashmi_preview");
    return base.replace("mongodb://", `mongodb://${username}:local-test-password@`) + `${base.includes("?") ? "&" : "?"}authSource=admin`;
  };
  try {
    process.env.VERCEL_ENV = "preview";
    process.env.MONGODB_URI = credentialUri("restricted_preview");
    const result = await verifyNewsPreviewIsolation();
    assert.equal(result.database, "nashmi_preview");
    assert.equal(result.productionWriteGranted, false);
    assert.equal(mongoose.connection.readyState, 0, "read-only inspection must not start Mongoose model initialization");
    const restricted = new mongoose.mongo.MongoClient(process.env.MONGODB_URI);
    try {
      await restricted.connect();
      assert.deepEqual(await restricted.db().listCollections().toArray(), [], "inspection must not create collections");
      await assert.rejects(() => restricted.db("production_fixture").listCollections().toArray(), (error: unknown) => error instanceof mongoose.mongo.MongoServerError && error.code === 13, "the restricted user cannot inspect another database");
    } finally { await restricted.close(); }
    process.env.MONGODB_URI = credentialUri("broad_preview");
    await assert.rejects(() => assertPipelineWriteIsolation(), /PERMISSIONS_UNVERIFIED/);
    assert.equal(mongoose.connection.readyState, 0, "a broad credential must be rejected before Mongoose connects");
  } finally {
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
    await replica.stop();
  }
}

async function testIngestionAndPublishing() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replSet.getUri("nashmi_news_pipeline_test");
  process.env.NEWS_PIPELINE_TEST_DB = "true";
  process.env.NEWS_REFRESH_SECRET = "test-news-refresh-secret-longer-than-thirty-two-characters";
  try {
    const read = async (url: string) => url.includes("NewsDetails") ? detail : archive;
    const first = await runNewsDiscovery(now, { sources: [source], read });
    assert.equal(first.created, 1);
    assert.equal(first.eligible, 2);
    const second = await runNewsDiscovery(now, { sources: [source], read });
    assert.equal(second.created, 0);
    assert.equal(second.duplicates, 1);
    assert.equal(await NewsCandidate.countDocuments({}), 1);
    assert.equal(await NewsEvent.countDocuments({}), 2);
    const savedEvents = await NewsEvent.find({});
    assert.ok(savedEvents.every((item) => item.evidence.length === 1 && item.evidence[0].passage.length >= 30));
    const failedSource = NEWS_SOURCES[1];
    const partial = await runNewsDiscovery(now, { sources: [source, failedSource], read: async (url, definition) => {
      if (definition.id === failedSource.id) throw new Error("SIMULATED_SOURCE_FAILURE");
      return read(url);
    } });
    assert.equal(partial.sources[source.id].found, 1, "healthy source continues after another source fails");
    assert.equal(partial.sources[failedSource.id].errors, 1);
    assert.equal(await NewsCandidate.countDocuments({}), 1);
    const shadow = await runNewsEditorial(now, async (events) => ({ ids: [String(events[0]._id)], model: "test" }));
    assert.equal(shadow.selected, 1);
    assert.equal(shadow.published, 0);
    assert.equal(await NewsItem.countDocuments({}), 0, "shadow selection is never public");
    const shadowState = await NewsRefreshState.findById("global");
    assert.equal(await NewsItem.countDocuments(buildActiveNewsQuery(new Date(), shadowState?.currentBatchId || null)), 0, "the public ticker query cannot see discovered or shadow-selected events");
    const event = await NewsEvent.findOne({ status: "eligible" });
    assert.ok(event);
    await NewsRefreshState.updateOne({ _id: "global" }, { $set: { pipelineEditorialLockToken: "test-lock" } });
    await assert.rejects(() => publishEventBatch([event], "failed-batch", "wrong-lock", now), /LOCK_LOST/);
    assert.equal(await NewsItem.countDocuments({}), 0, "failed transaction must not leave a partial batch");
    assert.equal(await publishEventBatch([event], "first-batch", "test-lock", now), 1);
    assert.equal(await NewsItem.countDocuments({}), 1);
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, "first-batch");
    assert.equal(await NewsEvent.countDocuments({ status: "eligible" }), 1, "an unselected event remains eligible");
    await assert.rejects(() => publishEventBatch([event], "repeat-batch", "test-lock", now));
    assert.equal(await NewsItem.countDocuments({}), 1, "published event cannot be inserted twice");
    const extra = await NewsEvent.insertMany(Array.from({ length: 21 }, (_, index) => ({ ...event.toObject(), _id: new mongoose.Types.ObjectId(), eventKey: `cap-event-${index}`, titleAr: `قرار حكومي موثق بشأن خدمة المواطنين رقم ${index}`, status: "eligible", publishedNewsItemId: null })));
    await assert.rejects(() => publishEventBatch(extra, "over-limit", "test-lock", now), /TOO_LARGE/);
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId, "first-batch", "a rejected oversized batch preserves the previous batch");
    assert.equal(await publishEventBatch(extra.slice(0, 20), "twenty-batch", "test-lock", now), 20);
    assert.equal(await NewsItem.countDocuments({ batchId: "twenty-batch", isActive: true }), 20);
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

async function main() {
  testPureRules();
  await testPreviewIsolationBeforeMongoose();
  await testIngestionAndPublishing();
  console.log("News pipeline parsing, 48-hour window, idempotency, shadow mode and atomic publishing passed.");
}

main().catch((error) => { console.error(error); process.exit(1); });
