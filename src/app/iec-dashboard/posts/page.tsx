import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PostCreateForm } from "@/components/dashboard/Forms";
import PostCard from "@/components/posts/PostCard";

export const dynamic = "force-dynamic";
const links = [
  { href: "/iec-dashboard", label: "الرئيسية" },
  { href: "/iec-dashboard/profile", label: "ملف الهيئة" },
  { href: "/iec-dashboard/posts", label: "منشورات الهيئة" },
  { href: "/iec-dashboard/laws", label: "القوانين" }
];

export default async function IecPostsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = await getIecDashboardData();
  return (
    <DashboardNav title="لوحة الهيئة" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PostCreateForm />
        <div className="space-y-4">{(data.posts as any[]).map((post) => <PostCard key={post._id} post={post} compact />)}</div>
      </div>
    </DashboardNav>
  );
}
