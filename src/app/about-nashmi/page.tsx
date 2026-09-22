import type { Metadata } from "next";
import AboutNashmiPageClient from "@/components/about/AboutNashmiPageClient";
import { getAboutNashmiContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "عن نشمي"
};

export default async function AboutNashmiPage() {
  const content = await getAboutNashmiContent();
  return <AboutNashmiPageClient content={content} />;
}
