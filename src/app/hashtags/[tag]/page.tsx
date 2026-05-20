import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import { I18nText } from "@/components/i18n/LanguageProvider";
import { getHashtagResults } from "@/lib/serverData";
import { normalizeHashtag } from "@/lib/localization";

export const dynamic = "force-dynamic";

export default async function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag || "");
  const normalized = normalizeHashtag(decodedTag);
  const data = await getHashtagResults(normalized);
  const posts = data.posts as any[];
  const polls = data.polls as any[];
  const empty = posts.length === 0 && polls.length === 0;

  return (
    <main className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">#{decodedTag.replace(/^#/, "")}</h1>
        <p className="mt-2 text-ink/70"><I18nText id="hashtags.subtitle" /></p>
      </div>

      {empty ? (
        <div className="card p-8 text-center text-ink/65">
          <I18nText id="hashtags.empty" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-xl font-black"><I18nText id="updates.posts" /></h2>
            {posts.length ? posts.map((post) => <PostCard key={post._id} post={post} />) : <p className="card p-5 text-ink/60"><I18nText id="hashtags.empty" /></p>}
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-black"><I18nText id="updates.polls" /></h2>
            {polls.length ? polls.map((poll) => <PollCard key={poll._id} poll={poll} />) : <p className="card p-5 text-ink/60"><I18nText id="hashtags.empty" /></p>}
          </section>
        </div>
      )}
    </main>
  );
}
