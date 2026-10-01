"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { feedCursor } from "@/lib/feedPagination";
import { normalizeHashtag } from "@/lib/localization";

export type UpdateItem = { type: "post" | "poll" | "survey"; publishedAt: string; item: any };
const itemKey = (item: UpdateItem) => `${item.type}-${item.item._id}`;
function unique(items: UpdateItem[]) { return [...new Map(items.map(item => [itemKey(item), item])).values()]; }
const lifetime = 5 * 60_000;
const pageSize = 10;

export function useSocialFeed(initialUpdates: UpdateItem[], initialSearch: string, initialFilter: string, connectionError: string) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [sort, setSort] = useState("newest");
  const initialPage = initialUpdates.slice(0, pageSize);
  const [updates, setUpdates] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(initialUpdates.length);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.length >= pageSize ? feedCursor(initialPage.at(-1)!) : null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<UpdateItem[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const pagingRef = useRef(false);
  const generation = useRef(0);
  const skipInitial = useRef(true);
  const restored = useRef(false);
  const restoring = useRef(false);
  const snapshot = useRef<any>(null);
  const errorText = useRef(connectionError);
  errorText.current = connectionError;
  const storageKey = `nashmi-feed-v1:${initialSearch}:${initialFilter}`;

  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const buildParams = useCallback((cursor?: string | null, since?: string) => {
    const params = new URLSearchParams({ limit: String(pageSize), filter, sort });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (hashtag.trim()) params.set("hashtag", normalizeHashtag(hashtag));
    if (cursor) params.set("cursor", cursor);
    if (since) params.set("since", since);
    return params;
  }, [debouncedSearch, filter, sort, fromDate, toDate, hashtag]);

  const load = useCallback(async (cursor?: string | null) => {
    if (cursor && pagingRef.current) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const revision = ++generation.current;
    pagingRef.current = Boolean(cursor);
    setLoading(!cursor); setLoadingMore(Boolean(cursor)); setError("");
    if (!cursor) { setNextCursor(null); setPendingUpdates([]); }
    try {
      const response = await fetch(`/api/updates?${buildParams(cursor)}`, { signal: controller.signal, cache: "no-store" });
      const json = await response.json();
      if (controller.signal.aborted || revision !== generation.current) return;
      if (!response.ok || !json.ok) throw new Error(json.error?.message || errorText.current);
      const incoming: UpdateItem[] = json.data?.updates || [];
      setUpdates(current => unique(cursor ? [...current, ...incoming] : incoming));
      setTotalCount(json.data?.totalCount ?? incoming.length);
      // A server returning the same cursor cannot create an infinite request loop.
      setNextCursor(json.nextCursor && json.nextCursor !== cursor ? json.nextCursor : null);
    } catch (cause) {
      if (controller.signal.aborted || revision !== generation.current) return;
      setError(cause instanceof Error ? cause.message : errorText.current);
      if (!cursor) setUpdates([]);
    } finally {
      if (revision === generation.current) { pagingRef.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [buildParams]);

  useEffect(() => {
    if (skipInitial.current) { skipInitial.current = false; if (initialUpdates.length) return; }
    if (restored.current) { restored.current = false; return; }
    void load();
    return () => { requestRef.current?.abort(); pagingRef.current = false; };
  }, [load, initialUpdates.length]);

  // Persist only public feed content, bounded to 100 entries and five minutes.
  // Never save a session token, a comment draft or a publisher form.
  snapshot.current = { updates: updates.slice(0, 100), nextCursor: updates.length <= 100 ? nextCursor : feedCursor(updates[99]), totalCount, search, filter, fromDate, toDate, hashtag, sort };
  useEffect(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (cached && cached.filter !== "followed" && Date.now() - cached.savedAt < lifetime && Array.isArray(cached.updates) && cached.updates.length <= 100) {
        restoring.current = true;
        const changed = cached.search !== initialSearch || cached.filter !== initialFilter || cached.fromDate || cached.toDate || cached.hashtag || cached.sort !== "newest";
        restored.current = Boolean(changed);
        setUpdates(cached.updates); setNextCursor(cached.nextCursor); setTotalCount(cached.totalCount);
        setSearch(cached.search); setDebouncedSearch(cached.search.trim()); setFilter(cached.filter);
        setFromDate(cached.fromDate); setToDate(cached.toDate); setHashtag(cached.hashtag); setSort(cached.sort);
        requestAnimationFrame(() => requestAnimationFrame(() => { window.scrollTo({ top: cached.scrollY || 0, behavior: "instant" }); restoring.current = false; }));
      }
    } catch { /* Storage can be disabled without preventing reading. */ }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (restoring.current || snapshot.current.filter === "followed" || window.location.pathname !== "/updates") return;
      try { sessionStorage.setItem(storageKey, JSON.stringify({ ...snapshot.current, scrollY: window.scrollY, savedAt: Date.now() })); } catch { /* Quota/storage policy: reading remains available. */ }
    };
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(save, 120); };
    // Capture before Next changes the URL or scrolls the new page to the top.
    const onNavigate = (event: MouseEvent) => { if ((event.target as Element)?.closest?.("a[href]")) save(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("click", onNavigate, true);
    return () => { clearTimeout(timer); save(); window.removeEventListener("scroll", onScroll); window.removeEventListener("pagehide", save); document.removeEventListener("click", onNavigate, true); requestRef.current?.abort(); };
  }, [storageKey, initialSearch, initialFilter]);

  useEffect(() => {
    if (!nextCursor || loading || loadingMore || error || !sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void load(nextCursor); }, { rootMargin: "350px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loading, loadingMore, error, load]);

  useEffect(() => {
    const newest = updates[0]?.publishedAt;
    if (!newest || sort !== "newest") return;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.visibilityState !== "visible" || loading || loadingMore) return;
      try {
        const response = await fetch(`/api/updates?${buildParams()}`, { signal: controller.signal, cache: "no-store" });
        const json = await response.json();
        if (json.ok && !controller.signal.aborted) setPendingUpdates(unique(json.data?.updates || []).filter(item => !updates.some(existing => itemKey(existing) === itemKey(item))));
      } catch { /* A background failure never interrupts reading. */ }
    };
    const interval = setInterval(() => void refresh(), 45_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(interval); controller.abort(); document.removeEventListener("visibilitychange", refresh); };
  }, [buildParams, sort, updates, loading, loadingMore]);
  const showPending = () => { void load(); window.scrollTo({ top: 0, behavior: "instant" }); };
  return { ready, search, setSearch, debouncedSearch, filter, setFilter, fromDate, setFromDate, toDate, setToDate, hashtag, setHashtag, sort, setSort, updates, totalCount, nextCursor, loading, loadingMore, error, load, sentinelRef, pendingUpdates, showPending };
}
