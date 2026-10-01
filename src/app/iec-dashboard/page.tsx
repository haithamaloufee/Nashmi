import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import PublisherCreateHub from "@/components/dashboard/PublisherCreateHub";
import StatCard from "@/components/ui/StatCard";
import { I18nText } from "@/components/i18n/LanguageProvider";

export const dynamic = "force-dynamic";
const links = [
  { href: "/iec-dashboard/surveys", labelKey: "dashboard.sidebar.surveys" },
  { href: "/iec-dashboard", labelKey: "dashboard.sidebar.home" },
  { href: "/iec-dashboard/profile", labelKey: "dashboard.sidebar.authorityProfile" },
  { href: "/iec-dashboard/posts", labelKey: "dashboard.sidebar.authorityPosts" },
  { href: "/iec-dashboard/laws", labelKey: "dashboard.sidebar.laws" }
] as const;

export default async function IecDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = await getIecDashboardData();
  const authorityAuthor = (data as any).authorityAuthor || { name: "الهيئة المستقلة للانتخاب", logoUrl: "/related/iec-logo.png" };
  return (
    <DashboardNav titleKey="dashboard.authority.title" links={links}>
      <h1 className="mb-5 text-2xl font-black"><I18nText id="dashboard.authority.title" /></h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard labelKey="dashboard.authority.stats.posts" value={(data.posts as any[]).length} />
        <StatCard labelKey="dashboard.authority.stats.laws" value={(data.laws as any[]).length} />
        <StatCard labelKey="dashboard.authority.stats.surveys" value={((data as any).surveys || []).length} />
      </div>
      <PublisherCreateHub basePath="/iec-dashboard" publisher={{ name: authorityAuthor.name, imageUrl: authorityAuthor.logoUrl, accountType: "authority" }} />
    </DashboardNav>
  );
}
