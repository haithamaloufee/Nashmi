import { Search } from "lucide-react";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import Alert from "@/components/ui/Alert";
import { getUpdates } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const filters = [
  ["all", "الكل"],
  ["posts", "منشورات"],
  ["polls", "تصويتات"],
  ["iec", "الهيئة"],
  ["followed", "الأحزاب المتابَعة"]
] as const;

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ search?: string; filter?: string }> }) {
  const params = await searchParams;
  const updates = (await getUpdates(params.search, params.filter || "all")) as any[];
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-black">آخر المستجدات</h1>
      <p className="mt-2 text-ink/70">تغذية موحدة للمنشورات والتصويتات العامة من الأحزاب والهيئة.</p>
      <form className="my-6 flex flex-wrap gap-2">
        <input name="search" defaultValue={params.search || ""} className="w-72 rounded border-line" placeholder="بحث في المستجدات" />
        <button className="rounded bg-civic px-4 py-2 text-white"><Search className="h-4 w-4" /></button>
        <div className="flex flex-wrap gap-2">
          {filters.map(([value, label]) => (
            <button key={value} name="filter" value={value} className="rounded border border-line px-3 py-2 text-sm">
              {label}
            </button>
          ))}
        </div>
      </form>
      {params.filter === "followed" ? <Alert>فلتر الأحزاب المتابعة يتطلب تسجيل الدخول عند استخدام API، وتبقى هوية المتابعين غير مكشوفة للأحزاب.</Alert> : null}
      <section className="mt-6 grid gap-4">
        {updates.map((update) => (update.type === "post" ? <PostCard key={`post-${update.item._id}`} post={update.item} /> : <PollCard key={`poll-${update.item._id}`} poll={update.item} />))}
      </section>
    </main>
  );
}
