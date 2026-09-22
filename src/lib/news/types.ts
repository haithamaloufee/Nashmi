export const NEWS_CATEGORIES = [
  "legislation",
  "government",
  "parliament",
  "parties",
  "elections",
  "municipal",
  "public_services",
  "education",
  "transport",
  "civic"
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export type NewsUrgency = "normal" | "breaking";

export const LEGISLATIVE_STAGES = [
  "proposal",
  "committee",
  "lower_house",
  "senate",
  "ratified",
  "published",
  "effective"
] as const;

export type LegislativeStage = (typeof LEGISLATIVE_STAGES)[number];

export type NewsSource = {
  title: string;
  url: string;
  publisher: string;
  sourceClass: "official" | "news_agency" | "reputable_media";
};

export type NewsContextSnapshot = {
  newsId: string;
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  urgency: NewsUrgency;
  publishedAt: Date;
  legislativeStage?: LegislativeStage | null;
  sources: NewsSource[];
};

export type PublicNewsItem = Omit<NewsContextSnapshot, "publishedAt"> & {
  id: string;
  publishedAt: string;
};

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  legislation: "تشريعات",
  government: "حكومة",
  parliament: "مجلس الأمة",
  parties: "أحزاب",
  elections: "انتخابات",
  municipal: "بلديات",
  public_services: "خدمات عامة",
  education: "تعليم",
  transport: "نقل",
  civic: "شأن مدني"
};
