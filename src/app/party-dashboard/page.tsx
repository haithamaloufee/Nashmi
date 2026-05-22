import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import PublisherCreateHub from "@/components/dashboard/PublisherCreateHub";
import StatCard from "@/components/ui/StatCard";
import { I18nText } from "@/components/i18n/LanguageProvider";

export const dynamic = "force-dynamic";
const links = [
  { href: "/party-dashboard/surveys", labelKey: "dashboard.sidebar.surveys" },
  { href: "/party-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/party-dashboard/profile", labelKey: "dashboard.sidebar.editProfile" },
  { href: "/party-dashboard/posts", labelKey: "dashboard.sidebar.posts" },
  { href: "/party-dashboard/polls", labelKey: "dashboard.sidebar.polls" }
] as const;

export default async function PartyDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "party") redirect("/login");
  const data = (await getPartyDashboardData(user.id)) as any;
  if (!data) redirect("/");
  return (
    <DashboardNav titleKey="dashboard.party.title" links={links}>
      <h1 className="mb-5 text-2xl font-bold">{data.party.name}</h1>
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard labelKey="dashboard.party.stats.followers" value={data.party.followersCount} />
        <StatCard labelKey="dashboard.party.stats.posts" value={data.posts.length} />
        <StatCard labelKey="dashboard.party.stats.polls" value={data.polls.length} />
        <StatCard labelKey="dashboard.party.stats.comments" value={data.comments} />
        <StatCard labelKey="dashboard.party.stats.surveys" value={(data.surveys || []).length} />
      </div>
      <p className="mt-5 rounded border border-line p-4 text-sm text-ink/70"><I18nText id="dashboard.party.metricsNote" /></p>
      <PublisherCreateHub basePath="/party-dashboard" publisher={{ name: data.party.name, imageUrl: data.party.logoUrl || null, accountType: "party" }} />
    </DashboardNav>
  );
}
