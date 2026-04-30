"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Compass, Loader2, Search } from "lucide-react";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import { PostCardSkeleton, SidebarSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/ToastProvider";

type UpdateItem = { type: "post" | "poll"; publishedAt: string; item: any };

const filters = [
  ["all", "الكل"],
  ["posts", "منشورات"],
  ["polls", "تصويتات"],
  ["iec", "الهيئة"],
  ["followed", "الأحزاب المتابَعة"]
] as const;

export default function UpdatesClient({ initialSearch = "", initialFilter = "all" }: { initialSearch?: string; initialFilter?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const load = useCallback(async (cursor?: string | null) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    const params = new URLSearchParams({ limit: "10", filter });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (cursor) params.set("cursor", cursor);
    try {
      const response = await fetch(`/api/updates?${params.toString()}`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (cursor) setLoadingMore(false);
      else setLoading(false);

      if (!json.ok) {
        showToast(json.error?.message || "تعذر تحميل المستجدات", "error");
        if (!cursor) setUpdates([]);
        return;
      }

      setUpdates((current) => (cursor ? [...current, ...(json.data.updates || [])] : json.data.updates || []));
      setNextCursor(json.nextCursor || null);
    } catch {
      if (cursor) setLoadingMore(false);
      else setLoading(false);
      if (!cursor) setUpdates([]);
      showToast("تعذر الاتصال بالخادم", "error");
    }
  }, [debouncedSearch, filter, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    updates.forEach((update) => {
      if (update.type !== "post") return;
      (update.item.tags || []).forEach((tag: string) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [updates]);

  const activeParties = useMemo(() => {
    const map = new Map<string, any>();
    updates.forEach((update) => {
      const party = update.item.partyId;
      if (party?._id || party?.slug) map.set(party._id || party.slug, party);
    });
    return [...map.values()].slice(0, 5);
  }, [updates]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-4">
        <div className="card p-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded border-line bg-white py-3 pr-10 focus:border-civic focus:ring-civic"
              placeholder="ابحث في المستجدات..."
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  filter === value ? "border-civic bg-civic text-white" : "border-line bg-white text-ink/70 hover:border-civic hover:text-civic"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : null}

        {!loading && updates.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-xl font-bold">لا توجد مستجدات مطابقة</h2>
            <p className="mt-2 text-ink/60">جرّب كلمة بحث مختلفة أو غيّر الفلتر.</p>
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-4">
            {updates.map((update) =>
              update.type === "post" ? <PostCard key={`post-${update.item._id}`} post={update.item} /> : <PollCard key={`poll-${update.item._id}`} poll={update.item} />
            )}
          </div>
        ) : null}

        {nextCursor ? (
          <button
            type="button"
            onClick={() => load(nextCursor)}
            disabled={loadingMore}
            className="w-full rounded border border-line bg-white px-4 py-3 font-semibold text-civic transition hover:border-civic hover:bg-civic/10 disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "تحميل المزيد"}
          </button>
        ) : null}
      </section>

      <aside className="hidden space-y-4 lg:block">
        {loading ? (
          <SidebarSkeleton />
        ) : (
          <>
            <div className="card p-4">
              <h2 className="font-bold">وصول سريع</h2>
              <div className="mt-3 grid gap-2 text-sm">
                <Link className="rounded px-2 py-2 hover:bg-civic/10 hover:text-civic" href="/parties">الأحزاب</Link>
                <Link className="rounded px-2 py-2 hover:bg-civic/10 hover:text-civic" href="/laws">افهم قانونك</Link>
                <Link className="rounded px-2 py-2 hover:bg-civic/10 hover:text-civic" href="/chat">المساعد الذكي</Link>
              </div>
            </div>
            <div className="card p-4">
              <h2 className="font-bold">جهات نشطة مؤخرًا</h2>
              <div className="mt-3 space-y-2">
                {activeParties.length ? activeParties.map((party) => (
                  <Link key={party._id || party.slug} href={party.slug ? `/parties/${party.slug}` : "/parties"} className="block rounded px-2 py-2 text-sm hover:bg-civic/10 hover:text-civic">
                    {party.name}
                  </Link>
                )) : <p className="text-sm text-ink/55">ستظهر الجهات عند توفر منشورات مرتبطة.</p>}
              </div>
            </div>
            <div className="card p-4">
              <h2 className="font-bold">وسوم متداولة</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length ? tags.map(([tag]) => (
                  <button key={tag} type="button" onClick={() => setSearch(tag)} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/70 hover:bg-civic/10 hover:text-civic">
                    #{tag.replace(/^#/, "")}
                  </button>
                )) : <p className="text-sm text-ink/55">لا توجد وسوم في النتائج الحالية.</p>}
              </div>
            </div>
            <div className="card border-civic/25 bg-civic/5 p-4">
              <div className="flex items-center gap-2 text-civic">
                <Bot className="h-5 w-5" />
                <h2 className="font-bold">المساعد الذكي</h2>
              </div>
              <p className="mt-2 text-sm leading-7 text-ink/70">اسأل عن القوانين أو طريقة قراءة برامج الأحزاب بشكل محايد.</p>
              <Link href="/chat" className="mt-3 inline-flex items-center gap-2 rounded bg-civic px-3 py-2 text-sm font-semibold text-white hover:bg-civic/90">
                <Compass className="h-4 w-4" />
                افتح المساعد
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
