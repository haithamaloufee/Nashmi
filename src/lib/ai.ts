import Law from "@/models/Law";
import { connectToDatabase } from "@/lib/db";
import { normalizeArabic } from "@/lib/arabicSearch";

export const CHAT_REFUSAL =
  "لا أستطيع ترشيح حزب أو توجيهك لاختيار سياسي معين. أقدر أشرح لك برامج الأحزاب المتاحة داخل المنصة بنبرة محايدة، أو أساعدك تفهم القانون وآلية المشاركة.";

const forbiddenPatterns = [
  "لمن اصوت",
  "لمين اصوت",
  "مين افضل حزب",
  "من افضل حزب",
  "رشح لي حزب",
  "اقترح حزب",
  "اي حزب اختار",
  "اختارلي حزب",
  "قارن الاحزاب واختر الافضل",
  "who should i vote for",
  "best party",
  "recommend a party",
  "which party should i choose",
  "vote for"
];

const allowedTopicPatterns = [
  "قانون",
  "انتخاب",
  "تصويت",
  "ترشح",
  "حزب",
  "احزاب",
  "الهيئه",
  "المستقله",
  "شارك",
  "منصه",
  "مشاركه",
  "حقوق",
  "دستور",
  "law",
  "election",
  "vote",
  "party",
  "platform"
];

export function isPoliticalRecommendationRequest(message: string) {
  const normalized = normalizeArabic(message);
  const english = message.toLowerCase();
  return forbiddenPatterns.some((pattern) => normalized.includes(normalizeArabic(pattern)) || english.includes(pattern));
}

export function isAllowedChatTopic(message: string) {
  const normalized = normalizeArabic(message);
  const english = message.toLowerCase();
  return allowedTopicPatterns.some((pattern) => normalized.includes(normalizeArabic(pattern)) || english.includes(pattern));
}

export async function generateNeutralAnswer(message: string, preferredLawId?: string) {
  if (isPoliticalRecommendationRequest(message)) {
    return { content: CHAT_REFUSAL, sourceLawIds: [] as string[], safetyFlags: ["party_recommendation_refused"], model: "local-rule" };
  }

  if (!isAllowedChatTopic(message)) {
    return {
      content: "أقدر أساعدك في شرح القوانين، مفاهيم الانتخابات، وطريقة استخدام منصة شارك. أعد صياغة سؤالك ضمن هذا النطاق وسأجيبك بنبرة محايدة.",
      sourceLawIds: [] as string[],
      safetyFlags: ["out_of_scope"],
      model: "local-rule"
    };
  }

  await connectToDatabase();
  const normalized = normalizeArabic(message);
  const lawQuery = preferredLawId
    ? { _id: preferredLawId, status: "published" }
    : {
        status: "published",
        $or: [
          { searchNormalized: { $regex: normalized.split(" ").filter(Boolean).slice(0, 4).join("|"), $options: "i" } },
          { tags: { $in: normalized.split(" ").filter(Boolean) } }
        ]
      };

  const laws = await Law.find(lawQuery).limit(3).lean();

  if (!process.env.OPENAI_API_KEY) {
    if (laws.length === 0) {
      return {
        content:
          "لم أجد مادة منشورة مرتبطة مباشرة بسؤالك داخل قاعدة قوانين شارك. بشكل عام، المشاركة السياسية الآمنة تبدأ بفهم الحقوق والواجبات وقراءة المصادر الرسمية، والشرح هنا للتوعية العامة وليس استشارة قانونية رسمية.",
        sourceLawIds: [] as string[],
        safetyFlags: ["no_source"],
        model: "local-rule"
      };
    }

    const law = laws[0];
    return {
      content: `حسب مادة "${law.title}"، الفكرة المبسطة هي: ${law.simplifiedExplanation} ${law.practicalExample ? `مثال عملي: ${law.practicalExample}` : ""} الشرح للتوعية العامة وليس استشارة قانونية رسمية.`,
      sourceLawIds: laws.map((item) => item._id.toString()),
      safetyFlags: [],
      model: "local-rule"
    };
  }

  return {
    content:
      laws.length > 0
        ? `وجدت مواد مرتبطة بسؤالك. ${laws.map((law) => `${law.title}: ${law.simplifiedExplanation}`).join(" ")} الشرح للتوعية العامة وليس استشارة قانونية رسمية.`
        : "لم أجد مادة منشورة مرتبطة مباشرة بسؤالك، ويمكنني تقديم شرح عام محايد ضمن نطاق القوانين والمشاركة السياسية.",
    sourceLawIds: laws.map((item) => item._id.toString()),
    safetyFlags: [],
    model: "local-safe-fallback"
  };
}
