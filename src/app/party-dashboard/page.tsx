import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import StatCard from "@/components/ui/StatCard";

export const dynamic = "force-dynamic";
const links = [
  { href: "/party-dashboard", label: "الرئيسية" },
  { href: "/party-dashboard/profile", label: "تعديل الملف" },
  { href: "/party-dashboard/posts", label: "المنشورات" },
  { href: "/party-dashboard/polls", label: "التصويتات" }
];

export default async function PartyDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav title="لوحة الحزب" links={links}>
      <h1 className="mb-5 text-2xl font-bold">{data.party.name}</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="المتابعون" value={data.party.followersCount} />
        <StatCard label="المنشورات" value={data.posts.length} />
        <StatCard label="التصويتات" value={data.polls.length} />
        <StatCard label="التعليقات" value={data.comments} />
      </div>
      <p className="mt-5 rounded border border-line p-4 text-sm text-ink/70">تعرض اللوحة مؤشرات إجمالية فقط. لا تظهر هويات المصوتين أو سجلات التصويت الفردية.</p>
    </DashboardNav>
  );
}
