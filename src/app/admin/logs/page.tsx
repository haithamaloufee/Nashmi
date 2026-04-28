import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

export default async function AdminLogsPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="card p-5">
        <h1 className="mb-4 text-2xl font-bold">سجل التدقيق</h1>
        <div className="space-y-3">
          {(data.auditLogs as any[]).map((log) => (
            <div key={log._id} className="rounded border border-line p-3">
              <p><b>{log.action}</b> - {log.targetType} - {log.actorRole}</p>
              <p className="text-sm text-ink/60">{new Date(log.createdAt).toLocaleString('ar')}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardNav>
  );
}