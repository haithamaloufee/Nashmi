import { normalizeArabic } from "@/lib/arabicSearch";

export type NewsTopic = "legislation" | "government" | "parliament" | "parties" | "elections" | "local_government" | "public_policy";
export type TopicMatch = { score: number; matchedTopics: NewsTopic[]; signals: string[] };

type Signal = { phrase: string; weight: number };
const TOPIC_SIGNALS: Record<NewsTopic, Signal[]> = {
  legislation: [
    { phrase: "مشروع قانون", weight: 7 }, { phrase: "قانون معدل", weight: 7 },
    { phrase: "تعديل قانون", weight: 6 }, { phrase: "الجريدة الرسمية", weight: 5 },
    { phrase: "تشريع", weight: 4 }, { phrase: "قانون", weight: 3 },
    { phrase: "مشروع نظام", weight: 5 }, { phrase: "نظام", weight: 2 },
    { phrase: "نظاماً جديداً", weight: 5 }
  ],
  government: [
    { phrase: "مجلس الوزراء", weight: 6 }, { phrase: "رئيس الوزراء", weight: 4 },
    { phrase: "قرار حكومي", weight: 5 }, { phrase: "خطة حكومية", weight: 4 },
    { phrase: "الحكومة", weight: 2 }
  ],
  parliament: [
    { phrase: "مجلس النواب", weight: 6 }, { phrase: "مجلس الأعيان", weight: 6 },
    { phrase: "مجلس الأمة", weight: 5 }, { phrase: "لجنة نيابية", weight: 4 },
    { phrase: "اللجنة القانونية", weight: 3 }, { phrase: "النواب", weight: 2 }
  ],
  parties: [
    { phrase: "قانون الأحزاب", weight: 7 }, { phrase: "الأحزاب السياسية", weight: 5 },
    { phrase: "اندماج حزب", weight: 6 }, { phrase: "تسجيل حزب", weight: 5 },
    { phrase: "حزب", weight: 3 }, { phrase: "الأحزاب", weight: 3 }
  ],
  elections: [
    { phrase: "الهيئة المستقلة للانتخاب", weight: 7 }, { phrase: "قانون الانتخاب", weight: 7 },
    { phrase: "تعليمات انتخابية", weight: 6 }, { phrase: "الدائرة الانتخابية", weight: 4 },
    { phrase: "الانتخابات", weight: 4 }, { phrase: "الناخبين", weight: 3 },
    { phrase: "الترشح", weight: 2 }
  ],
  local_government: [
    { phrase: "أمانة عمان", weight: 3 }, { phrase: "الإدارة المحلية", weight: 4 },
    { phrase: "مجلس بلدي", weight: 3 }, { phrase: "مجالس المحافظات", weight: 3 },
    { phrase: "بلدية", weight: 2 }, { phrase: "البلديات", weight: 2 }
  ],
  public_policy: [
    { phrase: "سياسة عامة", weight: 4 }, { phrase: "سياسة حكومية", weight: 4 },
    { phrase: "تعرفة", weight: 2 }, { phrase: "رسوم", weight: 2 },
    { phrase: "وزارة العمل", weight: 2 }, { phrase: "وزارة التربية", weight: 2 },
    { phrase: "النقل العام", weight: 2 }, { phrase: "للنقل العام", weight: 2 },
    { phrase: "تصاريح العمل", weight: 3 }
  ]
};

const ACTION_SIGNALS: Signal[] = [
  { phrase: "يقر", weight: 3 }, { phrase: "اقر", weight: 3 },
  { phrase: "يعتمد", weight: 3 }, { phrase: "اقرار", weight: 3 },
  { phrase: "يعدل", weight: 3 }, { phrase: "تعدل", weight: 3 }, { phrase: "تعديل", weight: 3 },
  { phrase: "تعديلات", weight: 3 }, { phrase: "يناقش", weight: 2 },
  { phrase: "يناقشون", weight: 2 }, { phrase: "مناقشة", weight: 2 },
  { phrase: "يصوت", weight: 3 }, { phrase: "يحيل", weight: 3 }, { phrase: "تحيل", weight: 3 },
  { phrase: "تصدر تعليمات", weight: 4 }, { phrase: "تعليمات جديدة", weight: 4 },
  { phrase: "نظام جديد", weight: 4 }, { phrase: "نظاماً جديداً", weight: 4 },
  { phrase: "قرار جديد", weight: 3 },
  { phrase: "دخل حيز التنفيذ", weight: 5 }, { phrase: "اندماج", weight: 4 },
  { phrase: "اندماجاً", weight: 4 },
  { phrase: "تسجيل", weight: 2 }, { phrase: "تنظيم", weight: 2 },
  { phrase: "اصلاح", weight: 3 }, { phrase: "لإصلاح", weight: 3 }, { phrase: "تغيير", weight: 2 },
  { phrase: "تقر", weight: 3 }, { phrase: "تعتمد", weight: 3 }
];

const JORDAN_CONTEXT = ["الأردن", "الأردني", "المملكة الأردنية", "عمان", "أمانة عمان", "الهيئة المستقلة للانتخاب"];
const FOREIGN_CONTEXT = ["الأمريكي", "الإيراني", "الإسرائيلي", "المصري", "السعودي", "اللبناني", "التركي", "الفرنسي", "الروسي", "الأوروبي", "الولايات المتحدة", "إيران", "إسرائيل", "مصر", "السعودية", "لبنان", "تركيا", "فرنسا", "روسيا", "المكسيك"];

function contains(text: string, phrase: string) {
  return ` ${text} `.includes(` ${normalizeArabic(phrase)} `);
}

function bestSignal(text: string, signals: Signal[]) {
  return signals.filter((signal) => contains(text, signal.phrase)).sort((a, b) => b.weight - a.weight)[0];
}

/** Discovery evidence, not an importance judgment. Gemini makes the final editorial choice. */
export function scoreNewsTopic(title: string, summary = ""): TopicMatch {
  const normalizedTitle = normalizeArabic(title);
  const normalizedSummary = normalizeArabic(summary);
  const matchedTopics: NewsTopic[] = [];
  const signals: string[] = [];
  let score = 0;

  const joined = `${normalizedTitle} ${normalizedSummary}`;
  const jordan = JORDAN_CONTEXT.some((term) => contains(joined, term));
  const foreign = FOREIGN_CONTEXT.some((term) => contains(joined, term));
  // General publisher feeds include foreign politics. An explicit foreign setting
  // cannot enter merely because it contains "parliament" or "government".
  if (foreign && !jordan) return { score: 0, matchedTopics, signals };

  for (const [topic, topicSignals] of Object.entries(TOPIC_SIGNALS) as [NewsTopic, Signal[]][]) {
    const titleMatch = bestSignal(normalizedTitle, topicSignals);
    const summaryMatch = bestSignal(normalizedSummary, topicSignals);
    const weighted = Math.max(titleMatch?.weight || 0, (summaryMatch?.weight || 0) * 0.5);
    if (!weighted) continue;
    matchedTopics.push(topic);
    score += weighted;
    signals.push((titleMatch && (!summaryMatch || titleMatch.weight >= summaryMatch.weight * 0.5) ? titleMatch : summaryMatch)!.phrase);
  }

  if (!matchedTopics.length) return { score: 0, matchedTopics: [], signals: [] };
  const titleAction = bestSignal(normalizedTitle, ACTION_SIGNALS);
  const summaryAction = bestSignal(normalizedSummary, ACTION_SIGNALS);
  const actionScore = Math.max(titleAction?.weight || 0, (summaryAction?.weight || 0) * 0.5);
  score += actionScore;
  if (titleAction || summaryAction) signals.push((titleAction && (!summaryAction || titleAction.weight >= summaryAction.weight * 0.5) ? titleAction : summaryAction)!.phrase);

  // Weak subjects need an actual policy or institutional development. Mentioning
  // a ministry, party or municipality in a routine event is insufficient.
  const strongAnchor = matchedTopics.some((topic) => {
    const titleMatch = bestSignal(normalizedTitle, TOPIC_SIGNALS[topic]);
    return Boolean(titleMatch && titleMatch.weight >= 5);
  });
  const meaningfulAction = actionScore >= 2;
  const weakOnly = !meaningfulAction;
  const localOrPolicy = matchedTopics.every((topic) => topic === "local_government" || topic === "public_policy" || topic === "government");
  if (weakOnly || (localOrPolicy && !meaningfulAction)) return { score: 0, matchedTopics: [], signals: [] };
  if ((matchedTopics.includes("public_policy") || matchedTopics.includes("government")) && !strongAnchor && !jordan) return { score: 0, matchedTopics: [], signals: [] };
  return { score, matchedTopics, signals: [...new Set(signals)] };
}

export const NEWS_TOPIC_THRESHOLD = 6;
