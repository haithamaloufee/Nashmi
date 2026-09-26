import { normalizeArabic } from "@/lib/arabicSearch";

// Only unmistakable noise belongs here; positive topic evidence is scored separately.
const HARD_EXCLUSIONS = [
  /كره القدم|مباراه|دوري المحترفين|رياضه|المنتخب يفوز/,
  /فنان|مشاهير|مهرجان غناي|حفل غناي/,
  /جريمه قتل|حادث سير|حوادث سير|حريق/,
  /طقس|حاله جويه|درجات الحراره/,
  /اعلان تجاري|عروض تجاريه|استطلاع راي|استفتاء رؤيا|شارك برايك|ما رايك|رايكم/,
  /ضبط\w*.{0,100}(لحوم|اطارات|مواد غذاييه)|لحوم منتهيه|اطارات منتهيه/,
  /حمله تفتيشيه|تفتيش روتيني|مخالفه مائيه/,
  /نصايح صحيه|وصفه طعام/
];

export function isObviousNonNashmiNews(title: string) {
  const normalized = normalizeArabic(title);
  return HARD_EXCLUSIONS.some((pattern) => pattern.test(normalized));
}
