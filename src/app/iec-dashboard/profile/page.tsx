import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { IecProfileForm } from "@/components/dashboard/Forms";
import { getCurrentUser } from "@/lib/auth";
import { getIecProfileData } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/iec-dashboard/profile", labelKey: "dashboard.sidebar.authorityProfile" },
  { href: "/iec-dashboard/posts", labelKey: "dashboard.sidebar.authorityPosts" },
  { href: "/iec-dashboard/laws", labelKey: "dashboard.sidebar.laws" }
] as const;

export default async function IecProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const authority = await getIecProfileData();
  if (!authority) redirect("/iec-dashboard");

  return (
    <DashboardNav titleKey="dashboard.authority.title" links={links}>
      <IecProfileForm authority={authority} />
    </DashboardNav>
  );
}
