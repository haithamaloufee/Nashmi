import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PostCreateForm } from "@/components/dashboard/Forms";
import PostCard from "@/components/posts/PostCard";

export const dynamic = "force-dynamic";
const links = [
  { href: "/party-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/party-dashboard/profile", labelKey: "dashboard.sidebar.partyProfile" },
  { href: "/party-dashboard/posts", labelKey: "dashboard.sidebar.posts" },
  { href: "/party-dashboard/polls", labelKey: "dashboard.sidebar.polls" }
] as const;

export default async function PartyPostsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav titleKey="dashboard.party.title" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PostCreateForm currentUser={user} />
        <div className="space-y-4">{data.posts.map((post: any) => <PostCard key={post._id} post={post} compact />)}</div>
      </div>
    </DashboardNav>
  );
}
