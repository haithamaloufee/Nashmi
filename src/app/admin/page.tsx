import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAdminStats } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

function ActionCard({ label, value, href, hint }: { label: string; value: string | number; href: string; hint: string }) {
  return (
    <Link
      href={href}
      className="card block p-5 transition hover:border-civic hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-civic/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-ink/60">{label}</div>
          <div className="mt-2 text-3xl font-bold text-civic">{value}</div>
        </div>
        <span className="rounded border border-line px-2 py-1 text-xs text-ink/60">فتح</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/60">{hint}</p>
    </Link>
  );
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");

  const stats = await getAdminStats();
  const cards = [
    { label: "المستخدمون", value: stats.users, href: "/admin/users", hint: "إدارة الحسابات والأدوار والحالة" },
    { label: "المواطنون", value: stats.citizens, href: "/admin/users?role=citizen", hint: "مراجعة حسابات المواطنين" },
    { label: "حسابات الأحزاب", value: stats.partyAccounts, href: "/admin/users?role=party", hint: "الحسابات الحزبية النشطة" },
    { label: "حسابات الهيئة", value: stats.iecAccounts, href: "/admin/users?role=iec", hint: "حسابات الهيئة المستقلة" },
    { label: "الإداريون", value: stats.adminAccounts, href: "/admin/users?role=admin", hint: "حسابات الإدارة والصلاحيات" },
    { label: "الأحزاب الموثقة", value: stats.verifiedParties, href: "/admin/parties?verified=true", hint: "إدارة ملفات الأحزاب وشعاراتها" },
    { label: "المنشورات", value: stats.posts, href: "/admin/moderation?type=posts", hint: "مراجعة منشورات المنصة" },
    { label: "التصويتات", value: stats.polls, href: "/admin/moderation?type=polls", hint: "إدارة التصويتات وحالتها" },
    { label: "التعليقات", value: stats.comments, href: "/admin/moderation?type=comments", hint: "مراجعة التعليقات المبلغ عنها أو المخفية" },
    { label: "البلاغات المفتوحة", value: stats.openReports?.length || 0, href: "/admin/reports?status=open", hint: "التعامل مع البلاغات قيد المراجعة" },
    { label: "القوانين", value: stats.laws, href: "/admin/laws", hint: "إدارة مواد التوعية القانونية" }
  ];

  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <ActionCard key={card.href} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">البلاغات المفتوحة</h2>
            <Link href="/admin/reports?status=open" className="text-sm font-semibold text-civic hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {(stats.openReports as any[]).length === 0 ? (
              <p className="text-ink/60">لا توجد بلاغات مفتوحة حالياً.</p>
            ) : (
              (stats.openReports as any[]).map((report) => (
                <Link key={report._id} href="/admin/reports?status=open" className="block rounded border border-line p-3 hover:border-civic">
                  {report.targetType} · {report.reason}
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">آخر التدقيق</h2>
            <Link href="/admin/logs" className="text-sm font-semibold text-civic hover:underline">
              السجل
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {(stats.recentAuditLogs as any[]).map((log) => (
              <p key={log._id} className="rounded border border-line p-3">
                {log.action} · {log.targetType}
              </p>
            ))}
          </div>
        </div>
      </div>
    </DashboardNav>
  );
}
