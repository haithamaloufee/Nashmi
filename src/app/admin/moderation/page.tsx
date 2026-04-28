import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardLists } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";
const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

export default async function AdminModerationPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const data = await getDashboardLists();
  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <div className="grid gap-6">
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">المنشورات</h1>
          <div className="space-y-3">
            {(data.postsList as any[]).slice(0, 10).map((post) => (
              <div key={post._id} className="rounded border border-line p-3">
                <b>{post.title}</b>
                <p className="text-sm text-ink/60">{post.status} - {post.authorType}</p>
                <button className="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white">إخفاء</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">التعليقات</h1>
          <div className="space-y-3">
            {(data.comments as any[]).slice(0, 10).map((comment) => (
              <div key={comment._id} className="rounded border border-line p-3">
                <p>{comment.content}</p>
                <p className="text-sm text-ink/60">{comment.status} - {comment.targetType}</p>
                <button className="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white">إخفاء</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">التصويتات</h1>
          <div className="space-y-3">
            {(data.polls as any[]).slice(0, 10).map((poll) => (
              <div key={poll._id} className="rounded border border-line p-3">
                <b>{poll.title}</b>
                <p className="text-sm text-ink/60">{poll.status} - {poll.authorType}</p>
                <button className="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white">إغلاق</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h1 className="mb-4 text-2xl font-bold">البلاغات</h1>
          <div className="space-y-3">
            {(data.reports as any[]).slice(0, 10).map((report) => (
              <div key={report._id} className="rounded border border-line p-3">
                <p>{report.reason}</p>
                <p className="text-sm text-ink/60">{report.status} - {report.targetType}</p>
                <button className="mt-2 rounded bg-green-500 px-3 py-1 text-sm text-white">حل</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardNav>
  );
}