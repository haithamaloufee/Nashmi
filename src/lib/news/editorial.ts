import { normalizeArabic } from "@/lib/arabicSearch";

// Cheap exclusions only. Gemini selects civic/political stories from the rest.
const OBVIOUSLY_UNRELATED = /(كره القدم|مباراه|دوري المحترفين|رياضه|فنان|مشاهير|مهرجان غناي|حفل غناي|جريمه قتل|حادث سير|حوادث سير|حريق|طقس|حاله جويه|درجات الحراره|اعلان تجاري|عروض تجاريه|استطلاع راي|استفتاء رؤيا|شارك برايك|ما رايك|رايكم|ضبط\w*.{0,100}(لحوم|اطارات|مواد غذاييه)|لحوم منتهيه|اطارات منتهيه|حمله تفتيشيه|تفتيش روتيني|مخالفه مائيه|نصايح صحيه|وصفه طعام)/;

export function isObviousNonNashmiNews(title: string) {
  return OBVIOUSLY_UNRELATED.test(normalizeArabic(title));
}
