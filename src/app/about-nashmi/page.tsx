import type { Metadata } from "next";
import AboutNashmiPageClient from "@/components/about/AboutNashmiPageClient";
import { getAboutNashmiContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Nashmi / عن نشمي"
};

export default async function AboutNashmiPage() {
  const content = await getAboutNashmiContent();
  return <AboutNashmiPageClient content={content} />;
}
