import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminStats } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import StatCard from "@/components/ui/StatCard";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const stats = await getAdminStats();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="المستخدمون" value={stats.users} />
        <StatCard label="المستخدمون النشطون" value={stats.activeUsers} />
        <StatCard label="المواطنون" value={stats.citizens} />
        <StatCard label="حسابات الأحزاب" value={stats.partyAccounts} />
        <StatCard label="حسابات الهيئة" value={stats.iecAccounts} />
        <StatCard label="الإداريون" value={stats.adminAccounts} />
        <StatCard label="الأحزاب" value={stats.parties} />
        <StatCard label="الأحزاب الموثقة" value={stats.verifiedParties} />
        <StatCard label="المنشورات" value={stats.posts} />
        <StatCard label="التصويتات" value={stats.polls} />
        <StatCard label="التعليقات" value={stats.comments} />
        <StatCard label="البلاغات" value={stats.reports} />
        <StatCard label="البلاغات المفتوحة" value={stats.openReports?.length || 0} />
        <StatCard label="القوانين" value={stats.laws} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-xl font-bold">البلاغات المفتوحة</h2>
          <div className="space-y-2 text-sm">{(stats.openReports as any[]).map((report) => <p key={report._id}>{report.targetType} - {report.reason}</p>)}</div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-xl font-bold">آخر التدقيق</h2>
          <div className="space-y-2 text-sm">{(stats.recentAuditLogs as any[]).map((log) => <p key={log._id}>{log.action} - {log.targetType}</p>)}</div>
        </div>
      </div>
    </DashboardNav>
  );
}
