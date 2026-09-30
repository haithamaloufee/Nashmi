import { normalizeArabic } from "@/lib/arabicSearch";

export const NEWS_EVENT_KINDS = ["government_decision", "government_regulation", "legislation", "parliamentary_session", "parliamentary_schedule", "parliamentary_committee", "parliamentary_oversight", "parliamentary_statement", "parliamentary_institutional_update", "party_activity", "party_statement", "party_internal_election", "party_organizational_update", "electoral_institutional_update"] as const;
export type EventKind = (typeof NEWS_EVENT_KINDS)[number];
export const NEWS_EVENT_STATUSES = ["announced", "held", "discussed", "recommended", "postponed", "cancelled", "reported", "adopted"] as const;
export type EventStatus = (typeof NEWS_EVENT_STATUSES)[number];

/** Classifies evidenced public activity, never the truth of a political claim. */
export function classifyPublicActivity(title: string, passage: string, publisher = "", publishedAt?: Date) {
  const heading = normalizeArabic(title);
  const text = normalizeArabic(`${title} ${passage}`);
  const institution = normalizeArabic(publisher);
  const parliament = /مجلس النواب|مجلس الاعيان|مجلس الامه|نيابي|النيابيه|النيابي|كتله برلمانيه/.test(text) || /مجلس النواب|مجلس الاعيان/.test(institution);
  const party = /(?:^|\s)حزب\s+\S+|الاحزاب السياسيه|المؤتمر الحزبي|الانتخابات الداخليه للحزب/.test(text);
  const activity = /اجتمع|اجتماع|عقد|انعقد|يلتقي|تلتقي|التقي|التقت|مؤتمر|جلسه|جدول اعمال|انتخب|انتخاب|بيان|صرح|قال|اكد|دعا|يناقش|ناقش|بحث|تبحث|شارك|تشارك|تزور|زار|مبادره|اطلق|حل حزب|تسجيل حزب|اندماج/.test(text);
  if ((!parliament && !party) || !activity) return null;
  if (/اشاعه|غير موثق|مصدر مجهول|الحياه الخاصه/.test(text)) return null;
  const lead = normalizeArabic(passage).slice(0, 320);
  const heldEvidence = /(?:^|\s)(عقد|عقدت|انعقد|انعقدت|اجتمع|اجتمعت|التقي|التقت|شارك|شاركت|زار|زارت)(?:\s|،)|خلال (لقايها|لقايه|اجتماعها|اجتماعه|الاجتماع|اللقاء)/.test(lead);
  const announcement = /سيعقد|ستعقد|موعد|جدول اعمال|يدعو.{0,30}جلسه/.test(heading) || /سيعقد|ستعقد|يعقد.{0,60}(غدا|القادم|يوم)/.test(lead) || (!heldEvidence && /يعقد|تعقد/.test(heading) && /جلسه|اجتماع|مؤتمر/.test(heading));
  const status: EventStatus = /تاجيل|اجل|مؤجله|ارجاء/.test(heading) ? "postponed" : /الغاء|الغي|ملغاه/.test(heading) ? "cancelled" : announcement || /دعوته للانعقاد|دعوه.{0,30}للانعقاد/.test(heading) ? "announced" : /توصيه|توصيات|اوصت|اوصي/.test(heading) ? "recommended" : /ناقش|يناقش|مناقشه/.test(heading) ? "discussed" : heldEvidence ? "held" : "reported";
  let kind: EventKind;
  // Membership mentioned in a speaker's biography is not evidence that a
  // committee itself held the activity. Require a committee actor/action.
  const committeeAction = /(?:عقدت|اجتمعت|التقت|زارت|اطلعت|بحثت)\s+(?:لجنه|اللجنه).{0,80}مجلس (?:الاعيان|النواب)/.test(lead);
  const electoralAuthority = /الهييه المستقله للانتخاب/.test(text) && /حل حزب|تسجيل حزب|عدد الاحزاب|الاحزاب السياسيه|انتخاب/.test(heading);
  if (electoralAuthority) {
    kind = "electoral_institutional_update";
  } else if (party && (/حزب/.test(heading) || /[:：]/.test(title)) && !/مجلس النواب|مجلس الاعيان|النيابيه/.test(heading)) {
    const internalElection = /(?:انتخاب|ينتخب|انتخب).{0,35}(قياد|امين|الامين|مكتب|المكتب|شوري|الشوري)|الانتخابات الداخليه/.test(heading) || (/امين|امينا/.test(heading) && /انتخب|انتخاب/.test(text));
    kind = internalElection ? "party_internal_election" : /حل حزب|تسجيل حزب|اندماج|قياده|امين عام|امينا عاما|تنظيمي/.test(heading) ? "party_organizational_update" : /[:：]|بيان|قال|صرح|اكد|دعا|يدعو|يطالب|موقف/.test(title + " " + heading) ? "party_statement" : "party_activity";
  } else {
    kind = /جلسه|جدول اعمال|موعد|اجتماع مجلس (النواب|الاعيان|الامه)/.test(heading) ? (status === "announced" || status === "postponed" || status === "cancelled" ? "parliamentary_schedule" : "parliamentary_session") : /مشروع قانون|قانون معدل/.test(heading) ? "legislation" : /استجواب|سؤال نيابي|اسئله|رقاب/.test(heading) ? "parliamentary_oversight" : /كتله حزب|كتله.*النيابيه/.test(text) || /انتخاب|مكتب المجلس|رئاسه المجلس|كتله/.test(heading) ? "parliamentary_institutional_update" : /لجنه|النيابيه|النيابي/.test(heading) || (heldEvidence && !/[:：]|قال|اكد|بيان/.test(heading) && committeeAction) ? "parliamentary_committee" : status === "held" ? "parliamentary_institutional_update" : "parliamentary_statement";
  }
  // An attribution is part of identity. Different speakers' statements must not merge.
  const partyName = /حزب\s+["«“]([^"»”]+)["»”]/.exec(`${title} ${passage}`)?.[1] || /حزب\s+(.+?)(?=\s+(?:يعقد|عقد|يدعو|دعا|ينظم|انتخب|ينتخب|يعلن|أعلن|اصدر|أصدر|يطالب|لامتناعه|خلفا|السيد|برئاسة|النيابية)|[،:؛.]|$)/.exec(`${title} ${passage}`)?.[1]?.trim();
  const actor = partyName ? `حزب ${partyName}`.slice(0, 160) : undefined;
  const attributedTo = /^(.*?)[:：]/.exec(title)?.[1]?.trim().slice(0, 160) || actor || (parliament ? (/مجلس الامه/.test(text) ? "مجلس الأمة" : /اعيان/.test(text) ? "مجلس الأعيان" : "مجلس النواب") : publisher);
  const explicitDate = /(?:موعد|جلسة|تنعقد|ستعقد|يعقد|تعقد)[^\n]{0,100}?(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(`${title} ${passage}`);
  let scheduledAt: Date | undefined;
  if (explicitDate && ["announced", "postponed", "cancelled"].includes(status)) {
    const [, year, month, day] = explicitDate;
    const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00+03:00`);
    const civil = new Date(date.getTime() + 3 * 60 * 60_000);
    if (Number.isFinite(date.getTime()) && civil.getUTCFullYear() === +year && civil.getUTCMonth() + 1 === +month && civil.getUTCDate() === +day) scheduledAt = date;
  }
  if (!scheduledAt && publishedAt && ["announced", "postponed", "cancelled"].includes(status)) {
    const months = ["كانون الثاني", "شباط", "اذار", "نيسان", "ايار", "حزيران", "تموز", "اب", "ايلول", "تشرين الاول", "تشرين الثاني", "كانون الاول"];
    const appointment = new RegExp(`(?:في|يوم|موعد|جلسه)\\s+(\\d{1,2})\\s+(${months.join("|")})\\s+(المقبل|القادم|\\d{4})`).exec(text);
    if (appointment) {
      const day = +appointment[1], month = months.indexOf(appointment[2]);
      const publicationCivil = new Date(publishedAt.getTime() + 3 * 60 * 60_000);
      let year = /\d{4}/.test(appointment[3]) ? +appointment[3] : publicationCivil.getUTCFullYear();
      if (!/\d{4}/.test(appointment[3]) && (month < publicationCivil.getUTCMonth() || (month === publicationCivil.getUTCMonth() && day < publicationCivil.getUTCDate()))) year++;
      const civil = new Date(Date.UTC(year, month, day));
      if (civil.getUTCMonth() === month && civil.getUTCDate() === day) scheduledAt = new Date(civil.getTime() - 3 * 60 * 60_000);
    }
  }
  return { kind, status, attributedTo: electoralAuthority ? "الهيئة المستقلة للانتخاب" : attributedTo, actor, scheduledAt, category: kind === "electoral_institutional_update" ? "elections" as const : kind.startsWith("party_") ? "parties" as const : kind === "legislation" ? "legislation" as const : "parliament" as const };
}
