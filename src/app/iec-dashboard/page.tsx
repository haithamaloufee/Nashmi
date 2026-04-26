import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import StatCard from "@/components/ui/StatCard";

export const dynamic = "force-dynamic";
const links = [
  { href: "/iec-dashboard", label: "الرئيسية" },
  { href: "/iec-dashboard/posts", label: "منشورات الهيئة" },
  { href: "/iec-dashboard/laws", label: "القوانين" }
];

export default async function IecDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = await getIecDashboardData();
  return (
    <DashboardNav title="لوحة الهيئة" links={links}>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="منشورات رسمية" value={(data.posts as any[]).length} />
        <StatCard label="مواد قانونية" value={(data.laws as any[]).length} />
      </div>
    </DashboardNav>
  );
}
