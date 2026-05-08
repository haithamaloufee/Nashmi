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

const roleLabels: Record<string, string> = {
  super_admin: "مدير أعلى",
  admin: "مدير",
  iec: "الهيئة",
  party: "حزب",
  citizen: "مواطن"
};

const actionLabels: Record<string, string> = {
  "law.create": "إضافة قانون",
  "law.update": "تحديث قانون",
  "law.hide": "إخفاء قانون",
  "auth.login": "تسجيل دخول",
  "auth.logout": "تسجيل خروج",
  "post.create": "إنشاء منشور",
  "post.update": "تحديث منشور",
  "poll.create": "إنشاء تصويت",
  "report.create": "إرسال بلاغ",
  "user.profile_update": "تحديث الملف"
};

function actorName(log: any) {
  if (log.actorUserId && typeof log.actorUserId === "object") return log.actorUserId.name || log.actorUserId.email || "مستخدم";
  return "النظام";
}

function describeLog(log: any) {
  if (log.metadata?.summary) return log.metadata.summary;
  const action = actionLabels[log.action] || log.action;
  const target = log.metadata?.title || log.targetType;
  return `${action} على ${target}`;
}

function filteredLogs(logs: any[], params: { action?: string; role?: string; target?: string; q?: string }) {
  const query = params.q?.trim().toLowerCase();
  return logs.filter((log) => {
    if (params.action && log.action !== params.action) return false;
    if (params.role && log.actorRole !== params.role) return false;
    if (params.target && log.targetType !== params.target) return false;
    if (!query) return true;
    return [log.action, log.targetType, log.actorRole, actorName(log), describeLog(log), log.metadata?.title, log.metadata?.slug]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<{ action?: string; role?: string; target?: string; q?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const params = await searchParams;
  const data = await getDashboardLists();
  const logs = filteredLogs(data.auditLogs as any[], params);
  const actions = Array.from(new Set((data.auditLogs as any[]).map((log) => log.action))).sort();
  const roles = Array.from(new Set((data.auditLogs as any[]).map((log) => log.actorRole).filter(Boolean))).sort();
  const targets = Array.from(new Set((data.auditLogs as any[]).map((log) => log.targetType))).sort();
  return (
    <DashboardNav title="لوحة الإدارة" links={links} wide>
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-2xl font-black">سجل التدقيق</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">عرض أوسع للأحداث المهمة مع وصف عملي، المستخدم، الدور، الكيان، وبصمة الاتصال عند توفرها.</p>
            </div>
            <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input name="q" defaultValue={params.q || ""} className="rounded border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="بحث في السجل" />
              <select name="action" defaultValue={params.action || ""} className="rounded border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">كل الإجراءات</option>
                {actions.map((action) => <option key={action} value={action}>{actionLabels[action] || action}</option>)}
              </select>
              <select name="role" defaultValue={params.role || ""} className="rounded border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">كل الأدوار</option>
                {roles.map((role) => <option key={role} value={role}>{roleLabels[role] || role}</option>)}
              </select>
              <select name="target" defaultValue={params.target || ""} className="rounded border-slate-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">كل الكيانات</option>
                {targets.map((target) => <option key={target} value={target}>{target}</option>)}
              </select>
              <button className="rounded bg-civic px-4 py-2 text-sm font-bold text-white lg:col-start-4">تصفية</button>
            </form>
          </div>
        </div>

        <div className="card overflow-auto p-0">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr className="text-right">
                <th className="px-4 py-3">الوقت</th>
                <th className="px-4 py-3">المستخدم</th>
                <th className="px-4 py-3">الدور</th>
                <th className="px-4 py-3">الإجراء</th>
                <th className="px-4 py-3">الكيان</th>
                <th className="px-4 py-3">الوصف</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">بصمات الاتصال</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-slate-200 align-top dark:border-slate-700">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(log.createdAt).toLocaleString("ar-JO")}</td>
                  <td className="px-4 py-3 font-semibold">{actorName(log)}</td>
                  <td className="px-4 py-3">{roleLabels[log.actorRole] || log.actorRole || "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-civic/10 px-3 py-1 text-xs font-bold text-civic dark:bg-emerald-200/12 dark:text-emerald-200">{actionLabels[log.action] || log.action}</span></td>
                  <td className="px-4 py-3">{log.targetType}{log.metadata?.slug ? <p className="mt-1 text-xs text-slate-500">{log.metadata.slug}</p> : null}</td>
                  <td className="max-w-md px-4 py-3 leading-7 text-slate-700 dark:text-slate-200">{describeLog(log)}</td>
                  <td className="px-4 py-3">{log.metadata?.status ? <span className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{log.metadata.status}</span> : "تم"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    <p>IP: {log.ipHash ? `${String(log.ipHash).slice(0, 10)}...` : "-"}</p>
                    <p>UA: {log.userAgentHash ? `${String(log.userAgentHash).slice(0, 10)}...` : "-"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 ? <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">لا توجد سجلات مطابقة للفلاتر الحالية.</p> : null}
        </div>
      </div>
    </DashboardNav>
  );
}
