import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LawCreateForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

export default async function AdminLawsPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LawCreateForm />
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">القوانين</h1>
          <div className="space-y-3">{(data.laws as any[]).map((law) => <div key={law._id} className="rounded border border-line p-3"><b>{law.title}</b><p className="text-sm text-ink/60">{law.category} - {law.status}</p></div>)}</div>
        </div>
      </div>
    </DashboardNav>
  );
}
