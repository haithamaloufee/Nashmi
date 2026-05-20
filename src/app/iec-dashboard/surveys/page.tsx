import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import SurveyBuilderForm from "@/components/surveys/SurveyBuilderForm";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", label: "الرئيسية" },
  { href: "/iec-dashboard/profile", label: "ملف الهيئة" },
  { href: "/iec-dashboard/posts", label: "منشورات الهيئة" },
  { href: "/iec-dashboard/laws", label: "القوانين" },
  { href: "/iec-dashboard/surveys", label: "Community Pulse" }
];

export default async function IecSurveysPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = (await getIecDashboardData()) as any;
  return (
    <DashboardNav title="لوحة الهيئة" links={links} wide>
      <SurveyBuilderForm surveys={data.surveys || []} mode="iec" />
    </DashboardNav>
  );
}
