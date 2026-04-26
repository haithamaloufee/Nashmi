import { notFound } from "next/navigation";
import FollowButton from "@/components/parties/FollowButton";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import ReportButton from "@/components/reports/ReportButton";
import Alert from "@/components/ui/Alert";
import { getCurrentUser } from "@/lib/auth";
import { getPartyBySlug } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export default async function PartyDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const data = (await getPartyBySlug(slug, user?.id)) as any;
  if (!data) notFound();
  const { party, posts, polls, isFollowing } = data;
  return (
    <main className="container-page py-8">
      <section className="card overflow-hidden">
        <div className="h-44 bg-[linear-gradient(135deg,#126b6f,#e8eee7)]" />
        <div className="p-6">
          <div className="-mt-16 mb-4 grid h-24 w-24 place-items-center rounded border-4 border-white bg-civic text-4xl font-black text-white">{party.name.slice(0, 1)}</div>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h1 className="text-3xl font-black">{party.name}</h1>
              <p className="mt-3 max-w-3xl leading-8 text-ink/75">{party.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <FollowButton partyId={party._id} initialFollowed={isFollowing} />
              <ReportButton targetType="party" targetId={party._id} />
            </div>
          </div>
          <div className="mt-6">
            <Alert>عرض معلومات الحزب هنا للتوعية فقط. شارك لا تقارن ولا ترشح ولا تفضل أي حزب.</Alert>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="font-bold">الرؤية</h2>
              <p className="mt-2 leading-8 text-ink/70">{party.vision}</p>
            </div>
            <div>
              <h2 className="font-bold">الأهداف</h2>
              <ul className="mt-2 list-inside list-disc leading-8 text-ink/70">
                {party.goals.map((goal: string) => <li key={goal}>{goal}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold">منشورات الحزب</h2>
          <div className="grid gap-4">{posts.map((post: any) => <PostCard key={post._id} post={post} />)}</div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">تصويتات الحزب</h2>
          <div className="grid gap-4">{polls.map((poll: any) => <PollCard key={poll._id} poll={poll} />)}</div>
        </div>
      </section>
    </main>
  );
}
