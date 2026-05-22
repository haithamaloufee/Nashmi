import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PollCreateForm } from "@/components/dashboard/Forms";
import PollCard from "@/components/polls/PollCard";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", label: "الرئيسية" },
  { href: "/iec-dashboard/profile", label: "ملف الهيئة" },
  { href: "/iec-dashboard/posts", label: "منشورات الهيئة" },
  { href: "/iec-dashboard/polls", label: "التصويتات" },
  { href: "/iec-dashboard/laws", label: "القوانين" },
  { href: "/iec-dashboard/surveys", label: "الاستبيانات" }
];

export default async function IecPollsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = (await getIecDashboardData()) as any;
  return (
    <DashboardNav title="لوحة الهيئة" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PollCreateForm />
        <div className="space-y-4">
          {(data.polls || []).length > 0 ? (data.polls as any[]).map((poll) => <PollCard key={poll._id} poll={poll} compact />) : <p className="card p-5 text-ink/60">لا توجد تصويتات بعد.</p>}
        </div>
      </div>
    </DashboardNav>
  );
}
