import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getIecDashboardData } from "@/lib/serverData";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PollCreateForm } from "@/components/dashboard/Forms";
import PollCard from "@/components/polls/PollCard";

export const dynamic = "force-dynamic";

const links = [
  { href: "/iec-dashboard", label: "Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©" },
  { href: "/iec-dashboard/profile", label: "Ù…Ù„Ù Ø§Ù„Ù‡ÙŠØ¦Ø©" },
  { href: "/iec-dashboard/posts", label: "Ù…Ù†Ø´ÙˆØ±Ø§Øª Ø§Ù„Ù‡ÙŠØ¦Ø©" },
  { href: "/iec-dashboard/polls", label: "Ø§Ù„ØªØµÙˆÙŠØªØ§Øª" },
  { href: "/iec-dashboard/laws", label: "Ø§Ù„Ù‚ÙˆØ§Ù†ÙŠÙ†" },
  { href: "/iec-dashboard/surveys", label: "Community Pulse" }
];

export default async function IecPollsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "iec") redirect("/login");
  const data = (await getIecDashboardData()) as any;
  return (
    <DashboardNav title="Ù„ÙˆØ­Ø© Ø§Ù„Ù‡ÙŠØ¦Ø©" links={links}>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <PollCreateForm />
        <div className="space-y-4">
          {(data.polls || []).length > 0 ? (data.polls as any[]).map((poll) => <PollCard key={poll._id} poll={poll} compact />) : <p className="card p-5 text-ink/60">لا توجد تصويتات بعد.</p>}
        </div>
      </div>
    </DashboardNav>
  );
}
