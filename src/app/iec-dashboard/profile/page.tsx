import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { IecProfileForm } from "@/components/dashboard/Forms";
import { getCurrentUser } from "@/lib/auth";
import { getIecProfileData } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", label: "الرئيسية" },
  { href: "/iec-dashboard/profile", label: "ملف الهيئة" },
  { href: "/iec-dashboard/posts", label: "منشورات الهيئة" },
  { href: "/iec-dashboard/laws", label: "القوانين" }
];

export default async function IecProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const authority = await getIecProfileData();
  if (!authority) redirect("/iec-dashboard");

  return (
    <DashboardNav title="لوحة الهيئة" links={links}>
      <IecProfileForm authority={authority} />
    </DashboardNav>
  );
}
