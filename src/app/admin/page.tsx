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
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const stats = await getAdminStats();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="المستخدمون" value={stats.users} />
        <StatCard label="الأحزاب" value={stats.parties} />
        <StatCard label="البلاغات" value={stats.reports} />
        <StatCard label="القوانين" value={stats.laws} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-xl font-bold">بلاغات مفتوحة</h2>
          <div className="space-y-2 text-sm">{(stats.openReports as any[]).map((report) => <p key={report._id}>{report.targetType} - {report.reason}</p>)}</div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-xl font-bold">آخر التدقيق</h2>
          <div className="space-y-2 text-sm">{(stats.auditLogs as any[]).map((log) => <p key={log._id}>{log.action} - {log.targetType}</p>)}</div>
        </div>
      </div>
    </DashboardNav>
  );
}
