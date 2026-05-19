import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/routeUtils";
import SiteContent from "@/models/SiteContent";

export const aboutNashmiKey = "about_nashmi";

export const defaultAboutNashmiContent = {
  key: aboutNashmiKey,
  titleAr: "عن نشمي",
  titleEn: "About Nashmi",
  bodyAr: "نشمي منصة رقمية تجريبية ومحايدة تعزز المشاركة المدنية وتسهّل الوصول إلى المعلومات الحزبية والانتخابية والتشريعية.",
  bodyEn: "Nashmi is a neutral experimental digital platform that strengthens civic participation and makes party, electoral, and legislative information easier to access.",
  youtubeUrl: null as string | null,
  youtubeVideoId: null as string | null,
  updatedAt: null as string | null
};

export async function getAboutNashmiContent() {
  await connectToDatabase();
  const content = await SiteContent.findOne({ key: aboutNashmiKey }).lean();
  return serialize(content ? { ...defaultAboutNashmiContent, ...content } : defaultAboutNashmiContent);
}
