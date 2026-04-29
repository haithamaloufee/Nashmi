import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LawCreateForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";
const links = [
  { href: "/iec-dashboard", label: "الرئيسية" },
  { href: "/iec-dashboard/profile", label: "ملف الهيئة" },
  { href: "/iec-dashboard/posts", label: "منشورات الهيئة" },
  { href: "/iec-dashboard/laws", label: "القوانين" }
];

export default async function IecLawsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = await getIecDashboardData();
  return (
    <DashboardNav title="لوحة الهيئة" links={links}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LawCreateForm />
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">مراجعة القوانين</h1>
          <div className="space-y-3">{(data.laws as any[]).map((law) => <div key={law._id} className="rounded border border-line p-3"><b>{law.title}</b><p className="text-sm text-ink/60">آخر تحقق: {law.lastVerifiedAt ? new Date(law.lastVerifiedAt).toLocaleDateString("ar-JO") : "غير متاح"}</p></div>)}</div>
        </div>
      </div>
    </DashboardNav>
  );
}
