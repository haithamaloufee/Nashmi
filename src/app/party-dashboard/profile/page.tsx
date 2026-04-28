import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PartyProfileForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";
const links = [
  { href: "/party-dashboard", label: "الرئيسية" },
  { href: "/party-dashboard/profile", label: "تعديل الملف" },
  { href: "/party-dashboard/posts", label: "المنشورات" },
  { href: "/party-dashboard/polls", label: "التصويتات" }
];

export default async function PartyProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav title="لوحة الحزب" links={links}>
      <PartyProfileForm party={data.party} />
    </DashboardNav>
  );
}
