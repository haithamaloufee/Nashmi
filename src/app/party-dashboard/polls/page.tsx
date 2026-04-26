import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PollCreateForm } from "@/components/dashboard/Forms";
import PollCard from "@/components/polls/PollCard";

export const dynamic = "force-dynamic";
const links = [
  { href: "/party-dashboard", label: "الرئيسية" },
  { href: "/party-dashboard/profile", label: "ملف الحزب" },
  { href: "/party-dashboard/posts", label: "المنشورات" },
  { href: "/party-dashboard/polls", label: "التصويتات" }
];

export default async function PartyPollsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav title="لوحة الحزب" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PollCreateForm />
        <div className="space-y-4">{data.polls.map((poll: any) => <PollCard key={poll._id} poll={poll} compact />)}</div>
      </div>
    </DashboardNav>
  );
}
