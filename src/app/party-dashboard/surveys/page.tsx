import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import SurveyBuilderForm from "@/components/surveys/SurveyBuilderForm";

export const dynamic = "force-dynamic";

const links = [
  { href: "/party-dashboard", label: "الرئيسية" },
  { href: "/party-dashboard/profile", label: "ملف الحزب" },
  { href: "/party-dashboard/posts", label: "المنشورات" },
  { href: "/party-dashboard/polls", label: "التصويتات" },
  { href: "/party-dashboard/surveys", label: "Community Pulse" }
];

export default async function PartySurveysPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav title="لوحة الحزب" links={links} wide>
      <SurveyBuilderForm surveys={data.surveys || []} mode="party" />
    </DashboardNav>
  );
}
