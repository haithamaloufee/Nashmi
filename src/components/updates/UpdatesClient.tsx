"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Home, Landmark, BookOpen, Info, Bot, Compass, Loader2, Search, SlidersHorizontal } from "lucide-react";
import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import SurveyFeedCard from "@/components/surveys/SurveyFeedCard";
import type { PublisherComposerProfile } from "@/components/dashboard/composers/types";
import { PostCardSkeleton, SidebarSkeleton } from "@/components/ui/Skeletons";
import { useSocialFeed, type UpdateItem } from "./useSocialFeed";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { extractHashtags, formatNumber, normalizeHashtag } from "@/lib/localization";

const AdvancedSearchModal = dynamic(() => import("@/components/updates/AdvancedSearchModal"), { ssr: false });
const UpdatesPublishButton = dynamic(() => import("@/components/updates/UpdatesPublishButton"), { ssr: false });
const filters = ["all", "posts", "polls", "surveys", "iec", "parties"] as const;
const quickFilters = ["all", "posts", "polls", "surveys"] as const;
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
  const { ready, search, setSearch, debouncedSearch, filter, setFilter, fromDate, setFromDate, toDate, setToDate, hashtag, setHashtag, sort, setSort, updates, totalCount, nextCursor, loading, loadingMore, error, load, sentinelRef, pendingUpdates, showPending } = useSocialFeed(initialUpdates, initialSearch, initialFilter, t("common.connectionFailed"));
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

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
      <div className="mt-0 grid grid-cols-1 gap-5 lg:grid-cols-[190px_minmax(0,680px)] xl:grid-cols-[210px_minmax(0,620px)_270px] lg:justify-center">
      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block lg:self-start" aria-label={t("social.explore")}>
        <h2 className="px-3 text-sm font-black text-ink/65">{t("social.explore")}</h2>
        <nav className="grid gap-1">{[{href:"/updates", key:"nav.home", icon:Home},{href:"/parties",key:"nav.parties",icon:Landmark},{href:"/iec",key:"content.authority",icon:Landmark},{href:"/laws",key:"nav.laws",icon:BookOpen},{href:"/about-nashmi",key:"nav.aboutNashmi",icon:Info}].map(({href,key,icon:Icon}) => <Link key={href} href={href} aria-current={href === "/updates" ? "page" : undefined} className="focus-ring flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-civic/10"><Icon className="h-6 w-6 text-civic dark:text-emerald-200"/>{t(key as any)}</Link>)}</nav>
        <p className="border-t border-line px-3 pt-4 text-xs leading-6 text-ink/65">{t("social.neutral")}</p>
      </aside>
      <section className="min-w-0 space-y-4" data-feed-region aria-busy={loading || loadingMore} aria-label={t("updates.title")}>
        <div className="card p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
            <label className="relative col-span-2 block sm:col-span-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/60" />
              <input
                disabled={!ready}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="social-search-input w-full py-3 ps-10 pe-4"
                placeholder={t("updates.search")}
                aria-label={t("updates.search")}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold xl:block">
              <span className="sr-only">{t("updates.sortBy")}</span>
              <select disabled={!ready} value={sort} onChange={(event) => setSort(event.target.value)} className="h-full w-full rounded border-line bg-white text-ink focus:border-civic focus:ring-civic dark:bg-slate-900 dark:text-white">
                {sortOptions.map((item) => <option key={item} value={item}>{t(sortLabelKeys[item])}</option>)}
              </select>
            </label>
            <button
              type="button"
              disabled={!ready}
              onClick={event => { event.currentTarget.focus(); setAdvancedFiltersOpen(true); }}
              aria-haspopup="dialog"
              aria-expanded={advancedFiltersOpen}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-civic/30 bg-civic/10 px-3 py-2.5 text-sm font-bold text-civic hover:border-civic hover:bg-civic hover:text-white dark:border-emerald-200/[0.35] dark:bg-emerald-200/10 dark:text-emerald-100 dark:hover:bg-emerald-200 dark:hover:text-slate-950"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("updates.advancedSearch")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((value) => (
                <button
                  key={value}
                  disabled={!ready}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition ${
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
                <p className="rounded-full bg-civic/10 px-3 py-2 text-sm font-black text-civic dark:bg-emerald-200/[0.12] dark:text-emerald-100">
                  {t("updates.resultsCount")} {formatNumber(totalCount, language)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {pendingUpdates.length ? <button type="button" onClick={showPending} className="focus-ring sticky top-[calc(var(--navbar-height)+12px)] z-10 min-h-11 w-full rounded-full bg-civic px-4 font-bold text-white shadow-soft">{t("social.newUpdates")} ({formatNumber(pendingUpdates.length,language)})</button> : null}
        {error ? <div role="alert" className="card space-y-3 border-red-300 p-4"><p className="text-sm text-red-700 dark:text-red-200">{error}</p><button type="button" onClick={() => void load(nextCursor)} className="focus-ring min-h-11 rounded-xl border border-line px-4 font-bold text-civic">{t("social.retry")}</button></div> : null}
        {loading ? (
          <div className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : null}

        {!loading && !error && updates.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-xl font-bold">{t("updates.noResults")}</h2>
            <p className="mt-2 text-ink/65">{t("updates.noResultsHint")}</p>
          </div>
        ) : null}

        <h2 className="sr-only">{t("updates.subtitle")}</h2>
        {!loading ? (
          <div className="space-y-4">
            {updates.map((update) => <div key={update.type + "-" + update.item._id} data-feed-item={update.type + "-" + update.item._id}>
              {update.type === "post" ? <PostCard post={update.item}/> : update.type === "poll" ? <PollCard poll={update.item}/> : <SurveyFeedCard survey={update.item}/>}
            </div>)}
          </div>
        ) : null}

        {nextCursor ? (
          <div ref={sentinelRef} data-feed-sentinel className="grid min-h-16 place-items-center pt-2" aria-live="polite">
            <button
              type="button"
              onClick={() => void load(nextCursor)}
              disabled={loadingMore}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-civic/25 bg-white px-5 text-sm font-black text-civic shadow-sm hover:border-civic hover:bg-civic hover:text-white disabled:opacity-60 dark:bg-slate-950 dark:text-emerald-200"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loadingMore ? t("common.loading") : t("common.showMore")}
            </button>
          </div>
        ) : !loading && updates.length ? <p role="status" className="py-5 text-center text-sm text-ink/65">{t("social.feedEnd")}</p> : null}
      </section>

      <aside className="hidden space-y-4 xl:sticky xl:top-20 xl:block xl:self-start">
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
                )) : <p className="text-sm text-ink/65">{t("updates.noEntities")}</p>}
              </div>
            </div>
            <div className="card p-4">
              <h2 className="font-bold">{t("updates.trendingHashtags")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length ? tags.map(([tag]) => (
                  <Link key={tag} href={`/hashtags/${encodeURIComponent(normalizeHashtag(tag))}`} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/70 hover:bg-civic/10 hover:text-civic dark:bg-slate-900 dark:text-slate-200">
                    #{tag.replace(/^#/, "")}
                  </Link>
                )) : <p className="text-sm text-ink/65">{t("updates.noHashtags")}</p>}
              </div>
            </div>
            <div className="card border-civic/25 bg-civic/5 p-4 dark:bg-emerald-200/[0.08]">
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
