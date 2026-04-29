import { redirect } from "next/navigation";
import Link from "next/link";
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

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: string) {
  if (status === "open") return "مفتوح";
  if (status === "dismissed") return "مرفوض";
  if (status === "action_taken") return "تم الإجراء";
  if (status === "reviewed") return "تمت المراجعة";
  return status;
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
          <div className="rounded border border-line px-3 py-2 text-sm text-ink/70">
            النتائج: <b className="text-ink">{reports.length}</b>
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

        {reports.length === 0 ? (
          <div className="rounded border border-line bg-slate-50 p-5 text-sm text-ink/70">لا توجد بلاغات مطابقة.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report._id} className="rounded border border-line p-4">
                <div className="mb-3 text-sm text-ink/70">{report.targetType} · {report.reason} · {statusLabel(report.status)}</div>
                {report.details ? <p className="mb-3">{report.details}</p> : <p className="mb-3 text-sm text-ink/60">لا توجد تفاصيل إضافية.</p>}
                <ReportModerationForm reportId={report._id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardNav>
  );
}
