import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAdminParties } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { AdminPartyLogoForm, PartyCreateForm } from "@/components/dashboard/Forms";

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

function partyStatusLabel(status: string | null | undefined) {
  if (status === "active") return "نشط";
  if (status === "archived") return "مؤرشف";
  if (status === "disabled") return "معطل";
  if (status === "draft") return "مسودة";
  return "غير محدد";
}

function filterHref(status: string, verified?: string) {
  const params = new URLSearchParams();
  if (status !== "active") params.set("status", status);
  if (verified) params.set("verified", verified);
  const query = params.toString();
  return query ? `/admin/parties?${query}` : "/admin/parties";
}

export default async function AdminPartiesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");

  const params = (await searchParams) || {};
  const status = readParam(params, "status") || "active";
  const verified = readParam(params, "verified");
  const q = readParam(params, "q") || "";
  const data = await getAdminParties({ status, verified, q });
  const parties = data.parties as any[];

  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PartyCreateForm />
        <div className="card p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">الأحزاب</h1>
              <p className="mt-1 text-sm text-ink/60">
                يعرض هذا القسم الأحزاب النشطة افتراضياً. استخدم فلتر الأرشيف لمراجعة السجلات القديمة فقط.
              </p>
            </div>
            <div className="rounded border border-line px-3 py-2 text-sm text-ink/70">
              النتائج: <b className="text-ink">{parties.length}</b>
            </div>
          </div>

          <form action="/admin/parties" className="mb-4 grid gap-2 md:grid-cols-[1fr_auto]">
            {status !== "active" ? <input type="hidden" name="status" value={status} /> : null}
            {verified ? <input type="hidden" name="verified" value={verified} /> : null}
            <input name="q" defaultValue={q} className="rounded border-line" placeholder="ابحث باسم الحزب أو slug" />
            <button className="rounded bg-civic px-4 py-2 font-semibold text-white">بحث</button>
          </form>

          <div className="mb-5 flex flex-wrap gap-2 text-sm">
            {[
              { href: filterHref("active"), label: "النشطة", active: status === "active" && !verified },
              { href: filterHref("active", "true"), label: "الموثقة", active: status === "active" && verified === "true" },
              { href: filterHref("active", "false"), label: "غير الموثقة", active: status === "active" && verified === "false" },
              { href: filterHref("archived"), label: "الأرشيف", active: status === "archived" },
              { href: filterHref("all"), label: "الكل", active: status === "all" }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded border px-3 py-2 ${item.active ? "border-civic bg-civic text-white" : "border-line bg-white hover:border-civic"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {parties.length === 0 ? (
            <div className="rounded border border-line bg-slate-50 p-5 text-sm text-ink/70">
              لا توجد أحزاب مطابقة للفلاتر الحالية.
            </div>
          ) : (
            <div className="space-y-3">
              {parties.map((party) => {
                const account = party.accountUserId && typeof party.accountUserId === "object" ? party.accountUserId : null;
                return (
                  <div key={party._id} className={`rounded border p-3 ${party.status === "archived" ? "border-amber-200 bg-amber-50/60" : "border-line"}`}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <b>{party.name}</b>
                        <span className="rounded border border-line px-2 py-0.5 text-xs text-ink/70">{partyStatusLabel(party.status)}</span>
                        {party.isVerified ? (
                          <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">موثق</span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-ink/60">غير موثق</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink/60">
                        {party.slug} · {party.followersCount || 0} متابع
                      </p>
                      <p className="mt-1 text-sm text-ink/60">
                        الحساب المرتبط: {account?.email || "غير مرتبط"}
                      </p>
                    </div>
                    <AdminPartyLogoForm party={party} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardNav>
  );
}
