import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PartyCreateForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/laws", label: "القوانين" },
  { href: "/admin/audit-logs", label: "سجل التدقيق" }
];

export default async function AdminPartiesPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PartyCreateForm />
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">الأحزاب</h1>
          <div className="space-y-3">{(data.parties as any[]).map((party) => <div key={party._id} className="rounded border border-line p-3"><b>{party.name}</b><p className="text-sm text-ink/60">{party.status} - {party.followersCount} متابع</p></div>)}</div>
        </div>
      </div>
    </DashboardNav>
  );
}
