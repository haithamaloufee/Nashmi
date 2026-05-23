"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Compass, Loader2, Search, SlidersHorizontal } from "lucide-react";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import SurveyFeedCard from "@/components/surveys/SurveyFeedCard";
import AdvancedSearchModal from "@/components/updates/AdvancedSearchModal";
import UpdatesPublishButton from "@/components/updates/UpdatesPublishButton";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { PostCardSkeleton, SidebarSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { extractHashtags, formatNumber, normalizeHashtag } from "@/lib/localization";

type UpdateItem = { type: "post" | "poll" | "survey"; publishedAt: string; item: any };

const pageSize = 10;
const refreshIntervalMs = 45000;

const filters = ["all", "posts", "polls", "surveys", "iec", "parties"] as const;
const sortOptions = ["newest", "oldest", "mostCommented", "mostLiked", "pollsEndingSoon"] as const;
const filterLabelKeys = {
  all: "updates.all",
  posts: "updates.posts",
  polls: "updates.polls",
  surveys: "updates.surveys",
  iec: "updates.authority",
  parties: "updates.parties"
} as const;
const sortLabelKeys = {
  newest: "updates.newestFirst",
  oldest: "updates.oldestFirst",
  mostCommented: "updates.mostCommented",
  mostLiked: "updates.mostLiked",
  pollsEndingSoon: "updates.pollsEndingSoon"
} as const;
const advancedFilterOptions = filters.map((value) => ({ value, labelKey: filterLabelKeys[value] }));

function updateKey(update: UpdateItem) {
  return `${update.type}-${update.item?._id || update.publishedAt}`;
}

function appendUnique(current: UpdateItem[], incoming: UpdateItem[]) {
  const seen = new Set(current.map(updateKey));
  return [
    ...current,
    ...incoming.filter((update) => {
      const key = updateKey(update);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  ];
}

function prependUnique(current: UpdateItem[], incoming: UpdateItem[]) {
  const seen = new Set(current.map(updateKey));
  return [
    ...incoming.filter((update) => {
      const key = updateKey(update);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    ...current
  ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export default function UpdatesClient({
  initialSearch = "",
  initialFilter = "all",
  initialUpdates = [],
  publisher = null
}: {
  initialSearch?: string;
  initialFilter?: string;
  initialUpdates?: UpdateItem[];
  publisher?: PublisherComposerProfile | null;
}) {
  const { language, t } = useTranslation();
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [sort, setSort] = useState("newest");
  const [updates, setUpdates] = useState<UpdateItem[]>(initialUpdates);
  const [totalCount, setTotalCount] = useState(initialUpdates.length);
  const [nextCursor, setNextCursor] = useState<string | null>(initialUpdates.length >= pageSize ? initialUpdates[initialUpdates.length - 1]?.publishedAt || null : null);
  const [loading, setLoading] = useState(initialUpdates.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const prefetchedPage = useRef<{ key: string; updates: UpdateItem[]; nextCursor: string | null } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreInFlightRef = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const buildParams = useCallback((cursor?: string | null, since?: string | null) => {
    const params = new URLSearchParams({ limit: String(pageSize), filter, sort });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (hashtag.trim()) params.set("hashtag", normalizeHashtag(hashtag));
    if (cursor) params.set("cursor", cursor);
    if (since) params.set("since", since);
    return params;
  }, [debouncedSearch, filter, fromDate, hashtag, sort, toDate]);

  const load = useCallback(async (cursor?: string | null) => {
    const params = buildParams(cursor);
    const key = params.toString();
    if (cursor && prefetchedPage.current?.key === key) {
      const page = prefetchedPage.current;
      prefetchedPage.current = null;
      setUpdates((current) => appendUnique(current, page.updates));
      setNextCursor(page.nextCursor);
      return;
    }
    if (cursor) {
      if (loadingMoreInFlightRef.current) return;
      loadingMoreInFlightRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch(`/api/updates?${key}`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (cursor) {
        loadingMoreInFlightRef.current = false;
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
      if (!json.ok) {
        showToast(json.error?.message || t("common.error"), "error");
        if (!cursor) setUpdates([]);
        return;
      }
      setUpdates((current) => (cursor ? appendUnique(current, json.data.updates || []) : json.data.updates || []));
      setTotalCount(json.data.totalCount ?? json.data.updates?.length ?? 0);
      setNextCursor(json.nextCursor || null);
    } catch {
      loadingMoreInFlightRef.current = false;
      setLoadingMore(false);
      setLoading(false);
      if (!cursor) setUpdates([]);
      showToast(t("poll.connectionFailed"), "error");
    }
  }, [buildParams, showToast, t]);

  useEffect(() => {
    if (!nextCursor || loading || loadingMore || sort !== "newest") return;
    const params = buildParams(nextCursor);
    const key = params.toString();
    if (prefetchedPage.current?.key === key) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/updates?${key}`, { signal: controller.signal, cache: "no-store" })
        .then((response) => response.json())
        .then((json) => {
          if (json?.ok) prefetchedPage.current = { key, updates: json.data?.updates || [], nextCursor: json.nextCursor || null };
        })
        .catch(() => undefined);
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [buildParams, filter, loading, loadingMore, nextCursor, sort]);

  useEffect(() => {
    if (
      debouncedSearch === initialSearch &&
      filter === initialFilter &&
      !fromDate &&
      !toDate &&
      !hashtag &&
      sort === "newest" &&
      initialUpdates.length
    ) {
      return;
    }
    prefetchedPage.current = null;
    void load();
  }, [debouncedSearch, filter, fromDate, hashtag, initialFilter, initialSearch, initialUpdates.length, load, sort, toDate]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextCursor || loading || loadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void load(nextCursor);
    }, { rootMargin: "700px 0px 900px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [load, loading, loadingMore, nextCursor]);

  useEffect(() => {
    const newestPublishedAt = updates[0]?.publishedAt;
    if (!newestPublishedAt || sort !== "newest") return;
    let cancelled = false;
    const refreshNewItems = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/updates?${buildParams(null, newestPublishedAt).toString()}`, { cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const incoming = json?.ok ? (json.data?.updates || []) as UpdateItem[] : [];
        if (!cancelled && incoming.length) setUpdates((current) => prependUnique(current, incoming));
      } catch {
        // Background refresh should not interrupt reading.
      }
    };
    const interval = window.setInterval(() => void refreshNewItems(), refreshIntervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshNewItems();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [buildParams, filter, sort, updates]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    updates.forEach((update) => {
      const text = update.type === "post"
        ? `${update.item.title || ""}\n${update.item.content || ""}\n${(update.item.tags || []).map((tag: string) => `#${tag}`).join(" ")}`
        : update.type === "poll"
          ? `${update.item.question || ""}\n${update.item.description || ""}`
          : `${update.item.title || ""}\n${update.item.description || ""}`;
      extractHashtags(text).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [updates]);

  const activeParties = useMemo(() => {
    const map = new Map<string, any>();
    updates.forEach((update) => {
      const party = update.item.partyId;
      if (party?._id || party?.slug) map.set(party._id || party.slug, party);
    });
    return [...map.values()].slice(0, 5);
  }, [updates]);

  const showResultsCount = Boolean(
    debouncedSearch ||
    filter !== "all" ||
    sort !== "newest" ||
    fromDate ||
    toDate ||
    hashtag.trim()
  );

  function resetFilters() {
    setSearch("");
    setFilter("all");
    setFromDate("");
    setToDate("");
    setHashtag("");
    setSort("newest");
  }

  const refreshAfterPublish = useCallback(() => {
    prefetchedPage.current = null;
    void load();
  }, [load]);
  const closeAdvancedFilters = useCallback(() => setAdvancedFiltersOpen(false), []);

  return (
    <>
      <AdvancedSearchModal
        open={advancedFiltersOpen}
        filterOptions={advancedFilterOptions}
        fromDate={fromDate}
        toDate={toDate}
        filter={filter}
        hashtag={hashtag}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onFilterChange={setFilter}
        onHashtagChange={setHashtag}
        onReset={resetFilters}
        onApply={closeAdvancedFilters}
        onClose={closeAdvancedFilters}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,820px)_280px] lg:justify-center xl:grid-cols-[minmax(0,840px)_300px]">
      <section className="min-w-0 space-y-4">
        <div className="card p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto] xl:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded border-line bg-white py-3 ps-10 text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white"
                placeholder={t("updates.search")}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold xl:block">
              <span className="sr-only">{t("updates.sortBy")}</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-full w-full rounded border-line bg-white text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white">
                {sortOptions.map((item) => <option key={item} value={item}>{t(sortLabelKeys[item])}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setAdvancedFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={advancedFiltersOpen}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-civic/30 bg-civic/10 px-4 py-2.5 text-sm font-black text-civic shadow-sm hover:border-civic hover:bg-civic hover:text-white dark:border-emerald-200/35 dark:bg-emerald-200/10 dark:text-emerald-100 dark:hover:bg-emerald-200 dark:hover:text-slate-950 xl:w-auto"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("updates.advancedSearch")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {filters.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    filter === value ? "border-civic bg-civic text-white" : "border-line bg-white text-ink/70 hover:border-civic hover:text-civic dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {t(filterLabelKeys[value])}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {publisher ? <UpdatesPublishButton publisher={publisher} onPublished={refreshAfterPublish} /> : null}
              {showResultsCount ? (
                <p className="rounded-full bg-civic/10 px-3 py-2 text-sm font-black text-civic dark:bg-emerald-200/12 dark:text-emerald-100">
                  {t("updates.resultsCount")} {formatNumber(totalCount, language)}
                </p>
              ) : null}
            </div>
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
            <h2 className="text-xl font-bold">{t("updates.noResults")}</h2>
            <p className="mt-2 text-ink/60">{t("updates.noResultsHint")}</p>
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-4">
            {updates.map((update) =>
              update.type === "post" ? (
                <PostCard key={`post-${update.item._id}`} post={update.item} />
              ) : update.type === "poll" ? (
                <PollCard key={`poll-${update.item._id}`} poll={update.item} />
              ) : (
                <SurveyFeedCard key={`survey-${update.item._id}`} survey={update.item} />
              )
            )}
          </div>
        ) : null}

        {nextCursor ? (
          <div ref={loadMoreRef} className="grid min-h-16 place-items-center text-civic" aria-live="polite">
            {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          </div>
        ) : null}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {loading ? (
          <SidebarSkeleton />
        ) : (
          <>
            <div className="card p-4">
              <h2 className="font-bold">{t("updates.recentEntities")}</h2>
              <div className="mt-3 space-y-2">
                {activeParties.length ? activeParties.map((party) => (
                  <Link key={party._id || party.slug} href={party.slug ? `/parties/${party.slug}` : "/parties"} className="block rounded px-2 py-2 text-sm hover:bg-civic/10 hover:text-civic">
                    {party.name}
                  </Link>
                )) : <p className="text-sm text-ink/55">{t("updates.noEntities")}</p>}
              </div>
            </div>
            <div className="card p-4">
              <h2 className="font-bold">{t("updates.trendingHashtags")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length ? tags.map(([tag]) => (
                  <Link key={tag} href={`/hashtags/${encodeURIComponent(normalizeHashtag(tag))}`} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/70 hover:bg-civic/10 hover:text-civic dark:bg-slate-900 dark:text-slate-200">
                    #{tag.replace(/^#/, "")}
                  </Link>
                )) : <p className="text-sm text-ink/55">{t("updates.noHashtags")}</p>}
              </div>
            </div>
            <div className="card border-civic/25 bg-civic/5 p-4 dark:bg-emerald-200/8">
              <div className="flex items-center gap-2 text-civic dark:text-emerald-200">
                <Bot className="h-5 w-5" />
                <h2 className="font-bold">{t("nav.chat")}</h2>
              </div>
              <p className="mt-2 text-sm leading-7 text-ink/70 dark:text-slate-300">{t("updates.assistantBody")}</p>
              <Link href="/chat" className="mt-3 inline-flex items-center gap-2 rounded bg-civic px-3 py-2 text-sm font-semibold text-white hover:bg-civic/90">
                <Compass className="h-4 w-4" />
                {t("updates.openAssistant")}
              </Link>
            </div>
          </>
        )}
      </aside>
      </div>
    </>
  );
}
