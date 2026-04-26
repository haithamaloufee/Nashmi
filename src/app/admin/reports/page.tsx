import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ReportModerationForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="card p-5">
        <h1 className="mb-4 text-2xl font-bold">البلاغات والمراجعة</h1>
        <div className="space-y-4">
          {(data.reports as any[]).map((report) => (
            <div key={report._id} className="rounded border border-line p-4">
              <div className="mb-3 text-sm text-ink/70">{report.targetType} - {report.reason} - {report.status}</div>
              {report.details ? <p className="mb-3">{report.details}</p> : null}
              <ReportModerationForm reportId={report._id} />
            </div>
          ))}
        </div>
      </div>
    </DashboardNav>
  );
}
