import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { UserControls, UserCreateForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-6">
        <UserCreateForm />
        <div className="card overflow-auto p-5">
          <h1 className="mb-4 text-2xl font-bold">إدارة المستخدمين</h1>
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="text-right"><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {(data.users as any[]).map((item) => (
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
        </div>
      </div>
    </DashboardNav>
  );
}
