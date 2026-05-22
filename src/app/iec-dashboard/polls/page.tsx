import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PollCreateForm } from "@/components/dashboard/Forms";
import PollCard from "@/components/polls/PollCard";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/iec-dashboard/profile", labelKey: "dashboard.sidebar.authorityProfile" },
  { href: "/iec-dashboard/posts", labelKey: "dashboard.sidebar.authorityPosts" },
  { href: "/iec-dashboard/polls", labelKey: "dashboard.sidebar.polls" },
  { href: "/iec-dashboard/laws", labelKey: "dashboard.sidebar.laws" },
  { href: "/iec-dashboard/surveys", labelKey: "dashboard.sidebar.surveys" }
] as const;

export default async function IecPollsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = (await getIecDashboardData()) as any;
  return (
    <DashboardNav titleKey="dashboard.authority.title" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PollCreateForm />
        <div className="space-y-4">
          {(data.polls || []).length > 0 ? (data.polls as any[]).map((poll) => <PollCard key={poll._id} poll={poll} compact />) : <p className="card p-5 text-ink/60">لا توجد تصويتات بعد.</p>}
        </div>
      </div>
    </DashboardNav>
  );
}
