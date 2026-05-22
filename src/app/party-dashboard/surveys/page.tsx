import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import SurveyBuilderForm from "@/components/surveys/SurveyBuilderForm";

export const dynamic = "force-dynamic";

const links = [
  { href: "/party-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/party-dashboard/profile", labelKey: "dashboard.sidebar.partyProfile" },
  { href: "/party-dashboard/posts", labelKey: "dashboard.sidebar.posts" },
  { href: "/party-dashboard/polls", labelKey: "dashboard.sidebar.polls" },
  { href: "/party-dashboard/surveys", labelKey: "dashboard.sidebar.surveys" }
] as const;

export default async function PartySurveysPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav titleKey="dashboard.party.title" links={links} wide>
      <SurveyBuilderForm surveys={data.surveys || []} mode="party" />
    </DashboardNav>
  );
}
