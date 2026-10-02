import SearchField from "@/components/ui/SearchField";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import UserManagement from "@/components/admin/UserManagement";

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
      <UserManagement key={`${role}:${q}`} users={users} role={role} q={q}>
          <form action="/admin/users" className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <SearchField name="q" defaultValue={q} placeholder="ابحث بالاسم أو البريد" label="ابحث بالاسم أو البريد" />
            <select aria-label="الدور" name="role" defaultValue={role} className="rounded border-line">
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

      </UserManagement>
    </DashboardNav>
  );
}
