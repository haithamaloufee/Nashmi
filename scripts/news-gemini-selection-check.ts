import { Types } from "mongoose";
import { selectEventIds } from "../src/lib/news/pipeline";

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_TEST_KEY_MISSING");
  const events = [
    { _id: new Types.ObjectId(), titleAr: "إقرار مشروع قانون معدل لقانون الهيئة المستقلة للانتخاب لسنة 2026.", summaryAr: "إقرار مشروع قانون معدل لقانون الهيئة المستقلة للانتخاب لسنة 2026.", actionStage: "cabinet_approved_draft", authority: "رئاسة الوزراء", verification: "official" },
    { _id: new Types.ObjectId(), titleAr: "رئيس الوزراء يوجِّه ببدء الإجراءات اللازمة لإنشاء 6 حدائق في مُدُن الزَّرقاء والطفيلة ومعان وجرش وعجلون ومأدبا تُنفَّذ جميعها خلال عام 2027م", summaryAr: "وجه رئيس الوزراء إلى البدء بالإجراءات اللازمة لإنشاء 6 حدائق في مدن الزرقاء والطفيلة ومعان وجرش وعجلون ومأدبا، على أن تنفذ جميعها خلال عام 2027.", actionStage: "directive", authority: "رئاسة الوزراء", verification: "official" }
  ];
  const primary = await selectEventIds(events, 2);
  process.env.NEWS_GEMINI_MODEL = "gemini-nonexistent-news-replay";
  process.env.NEWS_GEMINI_FALLBACK_MODEL = primary.model;
  const fallback = await selectEventIds(events, 2);
  if (fallback.model !== primary.model) throw new Error("GEMINI_FALLBACK_NOT_USED");
  console.log(JSON.stringify({ primary: { model: primary.model, selected: primary.ids.length }, forcedFallback: { model: fallback.model, selected: fallback.ids.length }, source: "public_official_evidence", publicWrite: false }));
}
main().catch((error) => { console.error(error instanceof Error ? error.name : "GEMINI_TEST_FAILED"); process.exit(1); });
