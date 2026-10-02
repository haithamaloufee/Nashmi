import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import ReportsList from "@/components/admin/ReportsList";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");

  const params = (await searchParams) || {};
  const status = readParam(params, "status") || "all";
  const data = await getDashboardLists();
  const reports = (data.reports as any[]).filter((report) => status === "all" || report.status === status);

  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">البلاغات والمراجعة</h1>
            <p className="mt-1 text-sm text-ink/60">راجع البلاغات المفتوحة أو المغلقة ونفذ الإجراء المناسب.</p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {[
            { href: "/admin/reports", label: "الكل", active: status === "all" },
            { href: "/admin/reports?status=open", label: "المفتوحة", active: status === "open" },
            { href: "/admin/reports?status=dismissed", label: "المرفوضة", active: status === "dismissed" },
            { href: "/admin/reports?status=action_taken", label: "تم الإجراء", active: status === "action_taken" }
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`rounded border px-3 py-2 ${item.active ? "border-civic bg-civic text-white" : "border-line bg-white hover:border-civic"}`}>
              {item.label}
            </Link>
          ))}
        </div>

        <ReportsList key={status} reports={reports} status={status} />
      </div>
    </DashboardNav>
  );
}
