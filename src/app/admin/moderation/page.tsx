import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAdminModerationData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import InlineModerationActions from "@/components/admin/InlineModerationActions";
import ReportModerationActions from "@/components/admin/ReportModerationActions";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

const tabs = [
  { key: "posts", label: "المنشورات" },
  { key: "comments", label: "التعليقات" },
  { key: "polls", label: "التصويتات" },
  { key: "reports", label: "البلاغات" }
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function labelStatus(status: string | null | undefined) {
  if (status === "published") return "منشور";
  if (status === "active") return "نشط";
  if (status === "closed") return "مغلق";
  if (status === "hidden") return "مخفي";
  if (status === "deleted") return "محذوف";
  if (status === "open") return "مفتوح";
  if (status === "dismissed") return "مرفوض";
  if (status === "action_taken") return "تم الإجراء";
  if (status === "reviewed") return "تمت المراجعة";
  return "غير محدد";
}

function statusOptions(type: string) {
  if (type === "posts" || type === "comments") return ["", "published", "hidden", "deleted"];
  if (type === "polls") return ["", "active", "closed", "hidden", "deleted"];
  if (type === "reports") return ["", "open", "dismissed", "action_taken", "reviewed"];
  return [""];
}

function statusOptionLabel(value: string) {
  return value ? labelStatus(value) : "كل الحالات";
}

function emptyText(type: string) {
  if (type === "posts") return "لا توجد منشورات مطابقة.";
  if (type === "comments") return "لا توجد تعليقات مطابقة.";
  if (type === "polls") return "لا توجد تصويتات مطابقة.";
  return "لا توجد بلاغات مطابقة.";
}

export default async function AdminModerationPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");

  const params = (await searchParams) || {};
  const requestedType = readParam(params, "type") || "posts";
  const type = tabs.some((tab) => tab.key === requestedType) ? requestedType : "posts";
  const q = readParam(params, "q") || "";
  const status = readParam(params, "status") || "";
  const data = await getAdminModerationData({ type, q, status });
  const results = (data[type as keyof typeof data] || []) as any[];

  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="card p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">الإشراف</h1>
            <p className="mt-1 text-sm text-ink/60">ابحث وراجع المنشورات والتعليقات والتصويتات والبلاغات من مكان واحد.</p>
          </div>
          <div className="rounded border border-line px-3 py-2 text-sm text-ink/70">
            النتائج: <b className="text-ink">{results.length}</b>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/moderation?type=${tab.key}`}
              className={`rounded border px-3 py-2 ${type === tab.key ? "border-civic bg-civic text-white" : "border-line bg-white hover:border-civic"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <form action="/admin/moderation" className="mb-5 grid gap-2 lg:grid-cols-[1fr_180px_auto]">
          <input type="hidden" name="type" value={type} />
          <input
            name="q"
            defaultValue={q}
            className="rounded border-line"
            placeholder="ابحث في المنشورات أو التعليقات أو التصويتات..."
          />
          <select name="status" defaultValue={status} className="rounded border-line">
            {statusOptions(type).map((option) => (
              <option key={option || "all"} value={option}>{statusOptionLabel(option)}</option>
            ))}
          </select>
          <button className="rounded bg-civic px-4 py-2 font-semibold text-white">تصفية</button>
        </form>

        {results.length === 0 ? (
          <div className="rounded border border-line bg-slate-50 p-5 text-sm text-ink/70">{emptyText(type)}</div>
        ) : null}

        {type === "posts" ? (
          <div className="space-y-3">
            {results.map((post) => (
              <div key={post._id} className="rounded border border-line p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <b>{post.title || "منشور بدون عنوان"}</b>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/70">{post.content}</p>
                    <p className="mt-1 text-sm text-ink/60">{labelStatus(post.status)} · {post.authorType}</p>
                  </div>
                  <InlineModerationActions targetType="post" targetId={post._id} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {type === "comments" ? (
          <div className="space-y-3">
            {results.map((comment) => (
              <div key={comment._id} className="rounded border border-line p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p>{comment.content}</p>
                    <p className="mt-1 text-sm text-ink/60">{labelStatus(comment.status)} · {comment.targetType}</p>
                  </div>
                  <InlineModerationActions targetType="comment" targetId={comment._id} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {type === "polls" ? (
          <div className="space-y-3">
            {results.map((poll) => (
              <div key={poll._id} className="rounded border border-line p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <b>{poll.question}</b>
                    {poll.description ? <p className="mt-1 line-clamp-2 text-sm text-ink/70">{poll.description}</p> : null}
                    <p className="mt-1 text-sm text-ink/60">{labelStatus(poll.status)} · {poll.authorType}</p>
                  </div>
                  <InlineModerationActions targetType="poll" targetId={poll._id} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {type === "reports" ? (
          <div className="space-y-3">
            {results.map((report) => (
              <div key={report._id} className="rounded border border-line p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <b>{report.reason}</b>
                    {report.details ? <p className="mt-1 text-sm text-ink/70">{report.details}</p> : <p className="mt-1 text-sm text-ink/60">لا توجد تفاصيل إضافية.</p>}
                    <p className="mt-1 text-sm text-ink/60">{labelStatus(report.status)} · {report.targetType}</p>
                  </div>
                  <ReportModerationActions reportId={report._id} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardNav>
  );
}
