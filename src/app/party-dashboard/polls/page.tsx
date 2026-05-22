import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PollCreateForm } from "@/components/dashboard/Forms";
import PollCard from "@/components/polls/PollCard";

export const dynamic = "force-dynamic";
const links = [
  { href: "/party-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/party-dashboard/profile", labelKey: "dashboard.sidebar.partyProfile" },
  { href: "/party-dashboard/posts", labelKey: "dashboard.sidebar.posts" },
  { href: "/party-dashboard/polls", labelKey: "dashboard.sidebar.polls" }
] as const;

export default async function PartyPollsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav titleKey="dashboard.party.title" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PollCreateForm />
        <div className="space-y-4">{data.polls.map((poll: any) => <PollCard key={poll._id} poll={poll} compact />)}</div>
      </div>
    </DashboardNav>
  );
}
