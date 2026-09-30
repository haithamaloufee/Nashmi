import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { eventDraftsFromMaterial, sameNewsEvent } from "../src/lib/news/pipelineCore";
import { publishEventBatch, runNewsDiscovery, runNewsEditorial } from "../src/lib/news/pipeline";
import { buildActiveNewsQuery } from "../src/lib/news/query";
import { NEWS_SOURCES, parseGovernmentArchive, parseGovernmentDetail, parseGovernmentDetailHeadline, type SourceMaterial } from "../src/lib/news/sourceRegistry";
import NewsCandidate from "../src/models/NewsCandidate";
import NewsEvent from "../src/models/NewsEvent";
import NewsItem from "../src/models/NewsItem";
import NewsRefreshState from "../src/models/NewsRefreshState";

const source = NEWS_SOURCES[0];
const now = new Date("2026-09-30T01:00:00.000Z");
const archive = `<a href='/Ar/NewsDetails/test-decision'><div class='media news-block'><p class='date'><span>29/09/2026</span></p><h5 class='card-title'>قرارات مجلس الوزراء بشأن التعليم والنقل العام</h5><p class='card-text'>أعلن مجلس الوزراء عن قرارات جديدة تتعلق بالتعليم والنقل العام في الأردن.</p></div></a>`;
const detail = `<div id='ctl00_ctl00_MainContent_ContentDetails_NewsSection'><p>وافق مجلس الوزراء على مشروع قانون جديد ينظم إجراءات القبول الجامعي في الأردن.</p><p>قرر مجلس الوزراء تعديل تعليمات النقل العام في المحافظات اعتبارا من العام المقبل.</p></div>`;

function testPureRules() {
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
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

async function main() {
  testPureRules();
  await testIngestionAndPublishing();
  console.log("News pipeline parsing, 48-hour window, idempotency, shadow mode and atomic publishing passed.");
}

main().catch((error) => { console.error(error); process.exit(1); });
