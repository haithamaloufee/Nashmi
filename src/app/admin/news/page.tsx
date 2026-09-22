import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/routeUtils";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import NewsAdminClient from "@/components/admin/NewsAdminClient";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/news", label: "الأخبار الحية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

export default async function AdminNewsPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  await connectToDatabase();
  const [items, state] = await Promise.all([NewsItem.find({}).sort({ publishedAt: -1 }).limit(100).lean(), NewsRefreshState.findById("global").lean()]);
  return <DashboardNav title="لوحة الإدارة" links={links}><NewsAdminClient initialItems={serialize(items) as any} initialState={serialize(state)} /></DashboardNav>;
}
