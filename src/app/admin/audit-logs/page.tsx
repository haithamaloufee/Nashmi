import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

export default async function AdminAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="card overflow-auto p-5">
        <h1 className="mb-4 text-2xl font-bold">سجل التدقيق</h1>
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="text-right"><th>الإجراء</th><th>الهدف</th><th>الدور</th><th>التاريخ</th></tr></thead>
          <tbody>{(data.auditLogs as any[]).map((log) => <tr key={log._id} className="border-t border-line"><td className="py-3">{log.action}</td><td>{log.targetType}</td><td>{log.actorRole || "-"}</td><td>{new Date(log.createdAt).toLocaleString("ar-JO")}</td></tr>)}</tbody>
        </table>
      </div>
    </DashboardNav>
  );
}
