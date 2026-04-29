import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { UserControls, UserCreateForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");

  const params = (await searchParams) || {};
  const role = readParam(params, "role") || "all";
  const q = readParam(params, "q") || "";
  const data = await getDashboardLists();
  const users = (data.users as any[]).filter((item) => {
    const matchesRole = role === "all" || (role === "admin" ? ["admin", "super_admin"].includes(item.role) : item.role === role);
    const haystack = `${item.name || ""} ${item.email || ""}`.toLowerCase();
    return matchesRole && (!q || haystack.includes(q.toLowerCase()));
  });

  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-6">
        <UserCreateForm />
        <div className="card overflow-auto p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
              <p className="mt-1 text-sm text-ink/60">استخدم الفلاتر للوصول للحسابات المطلوبة بسرعة.</p>
            </div>
            <div className="rounded border border-line px-3 py-2 text-sm text-ink/70">
              النتائج: <b className="text-ink">{users.length}</b>
            </div>
          </div>

          <form action="/admin/users" className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <input name="q" defaultValue={q} className="rounded border-line" placeholder="ابحث بالاسم أو البريد" />
            <select name="role" defaultValue={role} className="rounded border-line">
              <option value="all">كل الأدوار</option>
              <option value="citizen">المواطنون</option>
              <option value="party">حسابات الأحزاب</option>
              <option value="iec">حسابات الهيئة</option>
              <option value="admin">الإداريون</option>
            </select>
            <button className="rounded bg-civic px-4 py-2 font-semibold text-white">تصفية</button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {[
              { href: "/admin/users", label: "الكل", active: role === "all" },
              { href: "/admin/users?role=citizen", label: "المواطنون", active: role === "citizen" },
              { href: "/admin/users?role=party", label: "الأحزاب", active: role === "party" },
              { href: "/admin/users?role=iec", label: "الهيئة", active: role === "iec" },
              { href: "/admin/users?role=admin", label: "الإداريون", active: role === "admin" }
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`rounded border px-3 py-2 ${item.active ? "border-civic bg-civic text-white" : "border-line bg-white hover:border-civic"}`}>
                {item.label}
              </Link>
            ))}
          </div>

          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-right">
                <th>الاسم</th>
                <th>البريد</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item._id} className="border-t border-line">
                  <td className="py-3">{item.name}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>{item.status}</td>
                  <td><UserControls user={item} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 ? <p className="mt-4 rounded border border-line bg-slate-50 p-4 text-sm text-ink/70">لا توجد حسابات مطابقة.</p> : null}
        </div>
      </div>
    </DashboardNav>
  );
}
