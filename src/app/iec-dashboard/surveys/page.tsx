import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import SurveyBuilderForm from "@/components/surveys/SurveyBuilderForm";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/iec-dashboard/profile", labelKey: "dashboard.sidebar.authorityProfile" },
  { href: "/iec-dashboard/posts", labelKey: "dashboard.sidebar.authorityPosts" },
  { href: "/iec-dashboard/laws", labelKey: "dashboard.sidebar.laws" },
  { href: "/iec-dashboard/surveys", labelKey: "dashboard.sidebar.surveys" }
] as const;

export default async function IecSurveysPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = (await getIecDashboardData()) as any;
  return (
    <DashboardNav titleKey="dashboard.authority.title" links={links} wide>
      <SurveyBuilderForm surveys={data.surveys || []} mode="iec" />
    </DashboardNav>
  );
}
