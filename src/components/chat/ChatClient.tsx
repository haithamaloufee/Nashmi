"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Archive, ArrowDown, Loader2, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import TypingIndicator from "@/components/chat/TypingIndicator";
import MessageInput from "@/components/chat/MessageInput";
import { useMobileAssistantScrollLock, useVisibleViewport } from "@/components/chat/useVisibleViewport";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";
import { cleanAssistantContent } from "@/lib/chatDisplay";
import NewsContextCard, { type ClientNewsContext } from "@/components/chat/NewsContextCard";

const MarkdownMessage = dynamic(() => import("@/components/chat/MarkdownMessage"));

// Network failures follow the same visible recovery path as service failures.
function chatRequest(url: string, options?: RequestInit) {
  return fetch(url, options).catch(() => new Response(JSON.stringify({ ok: false, error: { messageKey: "chat.connectionError" } }), { status: 503, headers: { "Content-Type": "application/json" } }));
}

type GroundingSource = {
  title: string;
  url: string | null;
  sourceType: string;
};

type Message = {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  groundingSources?: GroundingSource[];
  createdAt?: string;
};

type Session = {
  _id: string;
  title?: string | null;
  status?: "active" | "archived" | "deleted";
  updatedAt?: string;
  newsContext?: ClientNewsContext | null;
};

type Usage = {
  subjectType: "guest" | "user";
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

type ChatUser = {
  name?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  profileImage?: string | null;
} | null;

const suggestedQuestions = {
  ar: [
    "ما هو حق تأسيس الأحزاب في الأردن؟",
    "ما دور الهيئة المستقلة للانتخاب؟",
    "كيف أقدر أقارن بين برامج الأحزاب بطريقة حيادية؟",
    "ما هي حقوق الشباب في المشاركة السياسية؟",
    "اشرح لي قانون الأحزاب بطريقة بسيطة."
  ],
  en: [
    "What is the right to establish political parties in Jordan?",
    "What is the role of the Independent Election Commission?",
    "How can I compare party programs neutrally?",
    "What are youth rights in political participation?",
    "Explain the Political Parties Law in simple terms."
  ]
};

function fallbackError(json: unknown, fallback: string, tFunc: (k: any) => string) {
  if (typeof json === "object" && json !== null && "error" in json) {
    const error = (json as { error?: { message?: string; code?: string; messageKey?: string } }).error || {};
    if (error.messageKey) return tFunc(error.messageKey);
    if (error.code === "MESSAGE_TOO_LONG") return tFunc("chat.errors.messageTooLong");
    if (error.code === "PAYLOAD_TOO_LARGE") return tFunc("chat.errors.payloadTooLarge");
    // Rate limit responses include a messageKey from assistantUsage, prefer that
    if (error.code === "RATE_LIMITED" && (error as any).messageKey) return tFunc((error as any).messageKey);
    if (typeof error.message === "string" && error.message.trim()) return error.message;
  }
  return fallback;
}

function sourceLabel(sourceType: string, language: "ar" | "en") {
  if (sourceType === "google_search") return language === "en" ? "Web source" : "مصدر ويب";
  if (sourceType === "news_source") return language === "en" ? "Saved news source" : "مصدر الخبر المحفوظ";
  return language === "en" ? "Nashmi source" : "مصدر من نشمي";
}

function userAvatarUrl(user: ChatUser) {
  return user?.avatarUrl || user?.image || user?.imageUrl || user?.profileImage || null;
}

export default function ChatClient({
  lawId,
  newsId,
  initialNewsContext = null,
  initialNewsSummary,
  authenticated,
  currentUser = null
}: {
  lawId?: string;
  newsId?: string;
  initialNewsContext?: ClientNewsContext | null;
  initialNewsSummary?: string;
  authenticated: boolean;
  currentUser?: ChatUser;
}) {
  const { dir, language, t } = useTranslation();
  const introMessage = useMemo<Message>(() => ({ role: "assistant", content: t("chat.welcome") }), [t]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const newsIntroMessage = useMemo<Message | null>(() => initialNewsSummary ? ({ role: "assistant", content: initialNewsSummary, groundingSources: initialNewsContext?.sources.map((source) => ({ title: source.title, url: source.url, sourceType: "news_source" })) || [] }) : null, [initialNewsContext, initialNewsSummary]);
  const [messages, setMessages] = useState<Message[]>(newsIntroMessage ? [newsIntroMessage] : [introMessage]);
  const [message, setMessage] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(authenticated);
  const [newsSessionLoading, setNewsSessionLoading] = useState(Boolean(authenticated && newsId));
  const [clientReady, setClientReady] = useState(false);
  const [currentNewsContext, setCurrentNewsContext] = useState<ClientNewsContext | null>(initialNewsContext);
  const [error, setError] = useState<string | null>(null);
  const [showLoginCta, setShowLoginCta] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [anchorActiveTurn, setAnchorActiveTurn] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const latestUserRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement | null>(null);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const visibleViewport = useVisibleViewport(true);
  useMobileAssistantScrollLock(mobileSidebarOpen, 1023);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const chatPage = workspace.closest<HTMLElement>(".chat-page");
    if (!chatPage) return;
    let active = true;
    const measure = () => {
      if (!active || !chatPage.isConnected || !workspace.isConnected) return;
      workspace.style.setProperty("--chat-top", `${Math.max(0, chatPage.getBoundingClientRect().top + window.scrollY)}px`);
    };
    const observer = new ResizeObserver(measure);
    const header = document.querySelector("body header");
    const ticker = document.querySelector(".news-ticker-shell");
    if (header) observer.observe(header);
    if (ticker) observer.observe(ticker);
    const mutation = new MutationObserver(measure);
    mutation.observe(document.body, { childList: true, subtree: true });
    measure();
    window.addEventListener("resize", measure);
    return () => { active = false; observer.disconnect(); mutation.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const keyboardOpen = Boolean(visibleViewport && typeof window !== "undefined" && visibleViewport.height < window.innerHeight - 120 && window.innerWidth < 640);
  const sidebarLabel = language === "en" ? "Conversation history" : "سجل المحادثات";
  const toggleLabel = language === "en" ? "Toggle conversation history" : "فتح وإغلاق سجل المحادثات";

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => { if (desktop.matches) setMobileSidebarOpen(false); };
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const opener = sidebarToggleRef.current;
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
      if (event.key !== "Tab") return;
      const focusable = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]') || []).filter(element => element.getClientRects().length);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Safari does not necessarily focus a clicked button; restore the opener explicitly.
      (opener || previousFocus)?.focus({ preventScroll: true });
    };
  }, [mobileSidebarOpen]);

  const activeSession = useMemo(() => sessions.find((session) => session._id === activeSessionId) || null, [sessions, activeSessionId]);
  const activeNewsContext = currentNewsContext;
  const showSuggestions = !loading && messages.length === 1 && messages[0]?.role === "assistant";
  const latestUserIndex = messages.reduce((last, item, index) => item.role === "user" ? index : last, -1);

  useEffect(() => {
    if (newsIntroMessage) return;
    setMessages((items) => (items.length === 1 && items[0]?.role === "assistant" ? [introMessage] : items));
  }, [introMessage, newsIntroMessage]);

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      setClientReady(true);
      const response = await chatRequest("/api/chat", { cache: "no-store", headers: { "x-nashmi-language": language } });
      const json = await response.json().catch(() => ({}));
      if (!cancelled && response.ok && json.ok) setUsage(json.data.usage);
    }
    void loadUsage();
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      if (!authenticated) {
        setSessionsLoading(false);
        return;
      }
      setSessionsLoading(true);
      const response = await chatRequest("/api/chat/sessions", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (cancelled) return;
      setSessionsLoading(false);
      if (response.status === 401) {
        setLoginOpen(true);
        return;
      }
      if (!response.ok || !json.ok) {
        setError(fallbackError(json, t("chat.error"), t));
        return;
      }
      const nextSessions = json.data.sessions || [];
      setSessions(nextSessions);
      if (!lawId && !newsId && nextSessions[0]?._id) {
        setActiveSessionId(nextSessions[0]._id);
        const messagesResponse = await chatRequest(`/api/chat/sessions/${nextSessions[0]._id}/messages`, { cache: "no-store" });
        const messagesJson = await messagesResponse.json().catch(() => ({}));
        if (!cancelled && messagesResponse.ok && messagesJson.ok) {
          setMessages(messagesJson.data.messages?.length ? messagesJson.data.messages : [introMessage]);
        }
      }
    }
    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [lawId, newsId, authenticated, introMessage, t]);

  useEffect(() => {
    if (!authenticated || !newsId) return;
    let cancelled = false;
    async function createNewsConversation() {
      setNewsSessionLoading(true);
      const response = await chatRequest("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsId })
      });
      const json = await response.json().catch(() => ({}));
      if (cancelled) return;
      setNewsSessionLoading(false);
      if (!response.ok || !json.ok) {
        setError(fallbackError(json, t("chat.error"), t));
        return;
      }
      setActiveSessionId(json.data.session._id);
      setCurrentNewsContext(json.data.session.newsContext || initialNewsContext);
      setMessages(json.data.initialMessage ? [json.data.initialMessage] : newsIntroMessage ? [newsIntroMessage] : [introMessage]);
      await refreshSessions(json.data.session._id);
    }
    void createNewsConversation();
    return () => { cancelled = true; };
    // newsId represents an explicit fresh ticker click; run exactly once for that immutable item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, newsId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const content = scrollContentRef.current;
      const nearBottom = !content || content.getBoundingClientRect().bottom <= container.getBoundingClientRect().bottom + 32;
      setShowScrollToBottom(!nearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    const observer = new ResizeObserver(handleScroll);
    observer.observe(container);
    if (scrollContentRef.current) observer.observe(scrollContentRef.current);
    handleScroll();
    return () => { container.removeEventListener("scroll", handleScroll); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!anchorActiveTurn || latestUserIndex < 0) return;
    const frame = window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      const user = latestUserRef.current;
      if (!container || !user) return;
      container.scrollTop += user.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, anchorActiveTurn, latestUserIndex]);

  useEffect(() => {
    if (!newsId || newsSessionLoading) return;
    const frame = window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [newsId, newsSessionLoading]);

  const scrollToBottom = () => {
    const container = scrollRef.current;
    const content = scrollContentRef.current;
    if (!container || !content) return;
    const top = container.scrollTop + content.getBoundingClientRect().bottom - container.getBoundingClientRect().bottom + 24;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  async function refreshSessions(selectedId?: string) {
    if (!authenticated) return;
    const response = await chatRequest("/api/chat/sessions", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.ok) {
      setSessions(json.data.sessions || []);
      if (selectedId) setActiveSessionId(selectedId);
    }
  }

  async function openSession(sessionId: string) {
    setMobileSidebarOpen(false);
    if (!authenticated) return;
    setError(null);
    setLastFailedPrompt(null);
    setAnchorActiveTurn(false);
    setActiveSessionId(sessionId);
    setCurrentNewsContext(sessions.find((session) => session._id === sessionId)?.newsContext || null);
    const response = await chatRequest(`/api/chat/sessions/${sessionId}/messages`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!response.ok || !json.ok) {
      setError(fallbackError(json, t("chat.error"), t));
      return;
    }
    setMessages(json.data.messages?.length ? json.data.messages : [introMessage]);
  }

  async function newConversation() {
    setMobileSidebarOpen(false);
    setError(null);
    setLastFailedPrompt(null);
    setAnchorActiveTurn(false);
    setMessage("");
    setMessages([introMessage]);
    setActiveSessionId(null);
    setCurrentNewsContext(null);
    if (!authenticated) return;

    const response = await chatRequest("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t("chat.newConversation") })
    });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!response.ok || !json.ok) {
      setError(fallbackError(json, t("chat.error"), t));
      return;
    }
    const session = json.data.session as Session;
    setActiveSessionId(session._id);
    await refreshSessions(session._id);
  }

  async function deleteConversation() {
    if (!activeSessionId) return;
    await deleteSession(activeSessionId);
  }

  async function deleteSession(sessionId: string) {
    if (!authenticated) return;
    if (!window.confirm(language === "en" ? "Delete this conversation?" : "هل أنت متأكد من حذف هذه المحادثة؟")) return;

    setError(null);
    const response = await chatRequest(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!response.ok || !json.ok) {
      setError(fallbackError(json, t("chat.error"), t));
      return;
    }

    const remainingSessions = sessions.filter((session) => session._id !== sessionId);
    setSessions(remainingSessions);
    if (activeSessionId !== sessionId) return;

    const nextSession = remainingSessions[0];
    if (nextSession?._id) {
      await openSession(nextSession._id);
      return;
    }

    setActiveSessionId(null);
    setMessages([introMessage]);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loading || newsSessionLoading || !clientReady) return;

    setError(null);
    setShowLoginCta(false);
    setMessage("");
    setAnchorActiveTurn(true);
    setMessages((items) => {
      const last = items[items.length - 1];
      if (last?.role === "user" && last.content === clean) return items;
      return [...items, { role: "user", content: clean }];
    });
    setLoading(true);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));

    const url = authenticated && activeSessionId ? `/api/chat/sessions/${activeSessionId}/messages` : lawId ? `/api/chat/law/${lawId}` : "/api/chat";

    let response: Response;
    try {
      response = await chatRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-nashmi-language": language },
        body: JSON.stringify({
          message: clean,
          lawId,
          newsId: authenticated ? undefined : newsId,
          language,
          sessionId: authenticated ? activeSessionId || undefined : undefined,
          history: !authenticated ? messages.slice(-8).map((item) => ({ role: item.role, content: item.content })) : undefined
        })
      });
    } catch {
      setLoading(false);
      setError(t("chat.error"));
      setLastFailedPrompt(clean);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    const json = await response.json().catch(() => ({}));
    setLoading(false);
    inputRef.current?.focus({ preventScroll: true });

    if (response.status === 401) {
      setLoginOpen(true);
      setMessages((items) => items.filter((item) => item.content !== clean || item.role !== "user"));
      return;
    }

    if (!response.ok || !json.ok) {
      const friendlyError = fallbackError(json, t("chat.error"), t);
      const usageData = json.error?.usage as Usage | undefined;
      if (usageData) setUsage(usageData);
      setShowLoginCta(json.error?.messageKey === "chat.limit.guestReached");
      setError(friendlyError);
      setLastFailedPrompt(clean);
      // Do NOT append backend/internal error text as a chat bubble. Errors
      // are shown via the error banner above.
      return;
    }

    if (json.data.usage) setUsage(json.data.usage);
    if (authenticated && json.data.session?._id) {
      setActiveSessionId(json.data.session._id);
      setCurrentNewsContext(json.data.session.newsContext || currentNewsContext);
      await refreshSessions(json.data.session._id);
    }
    setMessages((items) => [...items, json.data.message]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(message);
  }

  return (
    <div ref={workspaceRef} className={`chat-workspace ${desktopSidebarOpen ? "chat-workspace-sidebar" : ""}`} dir={dir} style={keyboardOpen && visibleViewport ? { position: "fixed", top: visibleViewport.top + 8, insetInline: 8, height: Math.max(180, visibleViewport.height - 16), zIndex: 70 } : undefined}>
      {mobileSidebarOpen ? <button type="button" className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" aria-label={language === "en" ? "Close conversation history" : "إغلاق سجل المحادثات"} onClick={() => setMobileSidebarOpen(false)} /> : null}
      <aside ref={sidebarRef} id="chat-history" aria-label={sidebarLabel} role={mobileSidebarOpen ? "dialog" : undefined} aria-modal={mobileSidebarOpen || undefined} className={`chat-history ${mobileSidebarOpen ? "chat-history-mobile" : "hidden"} ${desktopSidebarOpen ? "lg:flex" : "lg:hidden"}`}>
        <div className="flex items-center justify-between border-b border-line p-3 dark:border-slate-700">
          <h2 className="text-sm font-bold text-ink dark:text-white">{sidebarLabel}</h2>
          <button type="button" onClick={() => setMobileSidebarOpen(false)} className="focus-ring grid h-11 w-11 place-items-center rounded-xl hover:bg-civic/10 lg:hidden" aria-label={language === "en" ? "Close conversation history" : "إغلاق سجل المحادثات"}><X className="h-5 w-5" /></button>
          <button
            type="button"
            onClick={newConversation}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-civic transition duration-200 hover:border-civic hover:bg-civic/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 dark:border-slate-700 dark:text-emerald-200 dark:hover:bg-emerald-200/10"
            title={t("chat.newConversation")}
            aria-label={t("chat.newConversation")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overscroll-contain overflow-auto p-2">
          {authenticated && sessionsLoading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : null}
          {!authenticated ? (
            <div className="m-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-7 text-civic dark:border-emerald-200/20 dark:bg-emerald-200/10 dark:text-emerald-100">
              <p>{t("chat.guestSessions")}</p>
              <Link href="/login" className="mt-2 inline-flex rounded bg-civic px-3 py-1.5 text-xs font-bold text-white hover:bg-civic/90 dark:bg-emerald-200 dark:text-[#101820]">
                {t("chat.loginCta")}
              </Link>
            </div>
          ) : null}
          {authenticated && !sessionsLoading && sessions.length === 0 ? <p className="p-3 text-sm text-slate-600 dark:text-slate-300">{t("chat.noSavedConversations")}</p> : null}
          {sessions.map((session) => (
            <div
              key={session._id}
              className={`group flex items-center gap-1 rounded-xl px-1 transition duration-200 ${
                session._id === activeSessionId ? "bg-civic/10 font-bold text-civic dark:bg-emerald-200/12 dark:text-emerald-100" : "text-slate-700 hover:bg-civic/10 dark:text-slate-300 dark:hover:bg-emerald-200/10"
              }`}
            >
              <button type="button" onClick={() => openSession(session._id)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-start text-sm">
                {session.status === "archived" ? <Archive className="h-4 w-4 shrink-0" /> : <MessageSquare className="h-4 w-4 shrink-0" />}
                <span className="truncate">{session.title || t("chat.newConversation")}</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteSession(session._id);
                }}
                className="ms-1 me-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                aria-label={language === "en" ? "Delete conversation" : "حذف المحادثة"}
                title={language === "en" ? "Delete conversation" : "حذف المحادثة"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" aria-label={t("nav.chat")}>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2 dark:border-slate-800 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button ref={sidebarToggleRef} type="button" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-civic/10 lg:hidden" onClick={() => setMobileSidebarOpen(value => !value)} aria-label={toggleLabel} aria-expanded={mobileSidebarOpen} aria-controls="chat-history"><PanelLeftOpen className="h-5 w-5 rtl:rotate-180" /></button>
            <button type="button" className="focus-ring hidden h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-civic/10 lg:grid" onClick={() => setDesktopSidebarOpen(value => !value)} aria-label={toggleLabel} aria-expanded={desktopSidebarOpen} aria-controls="chat-history">{desktopSidebarOpen ? <PanelLeftClose className="h-5 w-5 rtl:rotate-180" /> : <PanelLeftOpen className="h-5 w-5 rtl:rotate-180" />}</button>
            <Sparkles className="h-5 w-5 shrink-0 text-civic dark:text-emerald-200" aria-hidden="true" />
            <div className="min-w-0">
            <h2 className="truncate text-sm font-black">{activeSession?.title || t("nav.chat")}</h2>
            {usage ? (
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {t("chat.remaining")} {formatNumber(usage.remaining, language)} {t("chat.remainingMessages")}
              </p>
            ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={newConversation} className="focus-ring grid h-11 w-11 place-items-center rounded-xl hover:bg-civic/10" aria-label={t("chat.newConversation")}><Plus className="h-5 w-5" /></button>
          {activeSessionId ? (
            <button
              type="button"
              onClick={deleteConversation}
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/30"
              title={language === "en" ? "Delete conversation" : "حذف المحادثة"}
              aria-label={language === "en" ? "Delete conversation" : "حذف المحادثة"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          </div>
        </div>

        {usage?.subjectType === "guest" ? (
          <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs leading-6 text-civic dark:border-emerald-200/20 dark:bg-emerald-200/10 dark:text-emerald-100">
            {t("chat.guestCta")} <Link href="/login" className="font-black underline">{t("chat.loginCta")}</Link>
          </div>
        ) : null}

        {activeNewsContext ? <NewsContextCard news={activeNewsContext} /> : null}

        {error ? (
          <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200">
            <span>{error} {showLoginCta ? <Link href="/login" className="font-bold underline">{t("chat.loginCta")}</Link> : null}</span>
            {lastFailedPrompt && !showLoginCta ? (
              <button type="button" onClick={() => sendMessage(lastFailedPrompt)} className="rounded bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:bg-red-900/50 dark:text-red-100 dark:hover:bg-red-900">
                {t("chat.retry")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} tabIndex={0} role="log" aria-label={t("nav.chat")} className="assistant-scrollbar focus-ring h-full overscroll-contain overflow-auto px-4 py-6 focus-visible:outline-offset-[-3px] sm:px-8" aria-live="polite">
            <div ref={scrollContentRef} className="space-y-6">
            {messages.map((item, index) => showSuggestions && !activeNewsContext && item.content === introMessage.content ? null : (
              <div key={item._id || `${item.role}-${index}`} ref={index === latestUserIndex ? latestUserRef : undefined} dir="ltr" className={`mx-auto flex max-w-3xl items-start gap-3 ${item.role === "user" ? "justify-end [&>:first-child]:order-2 [&>:last-child]:order-1" : "justify-start"}`}>
                <ChatAvatar role={item.role} name={item.role === "user" ? currentUser?.name : "Nashmi AI"} imageUrl={item.role === "user" ? userAvatarUrl(currentUser) : null} />
                <div
                  dir={dir}
                  className={`min-w-0 text-start leading-8 ${item.role === "user" ? "max-w-[85%] rounded-3xl bg-slate-100 px-4 py-3 text-slate-900 dark:bg-slate-800 dark:text-slate-100" : "flex-1 py-1 text-slate-900 dark:text-slate-100"}`}
                >
                  {item.role === "assistant" && item.content !== introMessage.content ? <MarkdownMessage content={cleanAssistantContent(item.content)} /> : <div className="whitespace-pre-wrap break-words">{item.content}</div>}
                  {item.role === "assistant" && item.groundingSources?.length ? (
                    <div className="mt-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
                      <p className="mb-1 font-bold text-slate-600 dark:text-slate-300">{language === "en" ? "Sources" : "المصادر"}</p>
                      <div className="space-y-1">
                        {item.groundingSources.map((source, sourceIndex) => (
                          <a
                            key={`${source.title}-${sourceIndex}`}
                            href={source.url || "#"}
                            target={source.url?.startsWith("http") ? "_blank" : undefined}
                            rel={source.url?.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="block break-words text-civic underline-offset-4 hover:underline dark:text-emerald-200"
                          >
                            <span className="text-slate-500 dark:text-slate-400">[{sourceLabel(source.sourceType, language)}]</span> {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {showSuggestions ? (
              <div className="mx-auto flex min-h-[min(440px,55dvh)] max-w-2xl flex-col justify-center py-8 dark:text-slate-100">
                {!activeNewsContext ? <div className="mb-7 text-center">
                  <Sparkles className="mx-auto mb-4 h-9 w-9 text-civic dark:text-emerald-200" aria-hidden="true" />
                  <h3 className="text-2xl font-bold sm:text-3xl">{language === "en" ? "How can Nashmi help?" : "كيف أقدر أساعدك؟"}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{introMessage.content}</p>
                </div> : null}
                <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-200">{language === "en" ? "Suggested questions" : "أسئلة مقترحة"}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(activeNewsContext
                    ? (language === "en"
                      ? ["What happened?", "How could this affect citizens?", "What do the saved sources say?", "What is the latest status?"]
                      : ["شو اللي صار باختصار؟", "كيف ممكن يأثر هذا على المواطن؟", "شو بتحكي المصادر المحفوظة؟", "شو آخر تحديث على الموضوع؟"])
                    : suggestedQuestions[language]).map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start text-sm leading-6 text-slate-700 transition-colors hover:border-civic hover:bg-civic/5 hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-300 dark:hover:text-emerald-200"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div dir="ltr" className="flex items-end justify-start gap-2">
                <ChatAvatar role="assistant" compact />
                <TypingIndicator label={t("chat.sending")} />
              </div>
            ) : null}
            </div>
            {anchorActiveTurn ? <div aria-hidden="true" className="h-[min(560px,50dvh)]" /> : null}
          </div>

          {showScrollToBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-4 left-4 z-10 rounded-full bg-civic p-2 text-white shadow-lg transition hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 active:scale-95 dark:bg-emerald-200 dark:text-slate-950 dark:hover:bg-emerald-100"
              aria-label={t("chat.scrollBottom")}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        <form id="chat-composer" ref={composerRef} onSubmit={submit} autoComplete="off" className="mx-auto flex w-full max-w-3xl shrink-0 items-end gap-2 px-3 pb-4 pt-2 sm:px-5">
          <MessageInput
            ref={inputRef}
            value={message}
            onChange={setMessage}
            placeholder={t("chat.placeholder")}
            disabled={newsSessionLoading || !clientReady}
            label={t("chat.inputLabel")}
          />
          <button
            type="submit"
            disabled={loading || newsSessionLoading || !clientReady || !message.trim()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-civic text-white shadow-sm transition duration-200 hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-200 dark:text-slate-950 dark:hover:bg-emerald-100"
            aria-label={t("chat.send")}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>

      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
