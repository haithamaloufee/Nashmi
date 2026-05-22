"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Archive, ArrowDown, Loader2, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { LoginPrompt } from "@/components/ui/LoginPrompt";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";

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
  }
  return fallback;
}

function sourceLabel(sourceType: string, language: "ar" | "en") {
  if (sourceType === "google_search") return language === "en" ? "Web source" : "مصدر ويب";
  return language === "en" ? "Nashmi source" : "مصدر من نشمي";
}

function userAvatarUrl(user: ChatUser) {
  return user?.avatarUrl || user?.image || user?.imageUrl || user?.profileImage || null;
}

export default function ChatClient({ lawId, authenticated, currentUser = null }: { lawId?: string; authenticated: boolean; currentUser?: ChatUser }) {
  const { dir, language, t } = useTranslation();
  const introMessage = useMemo<Message>(() => ({ role: "assistant", content: t("chat.welcome") }), [t]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [message, setMessage] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(authenticated);
  const [error, setError] = useState<string | null>(null);
  const [showLoginCta, setShowLoginCta] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestAssistantRef = useRef<HTMLDivElement | null>(null);
  const latestUserRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const pendingAssistantFocusRef = useRef(false);

  const activeSession = useMemo(() => sessions.find((session) => session._id === activeSessionId) || null, [sessions, activeSessionId]);
  const showSuggestions = !loading && messages.length === 1 && messages[0]?.role === "assistant";

  useEffect(() => {
    setMessages((items) => (items.length === 1 && items[0]?.role === "assistant" ? [introMessage] : items));
  }, [introMessage]);

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      const response = await fetch("/api/chat", { cache: "no-store", headers: { "x-nashmi-language": language } });
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
      const response = await fetch("/api/chat/sessions", { cache: "no-store" });
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
      if (!lawId && nextSessions[0]?._id) {
        setActiveSessionId(nextSessions[0]._id);
        const messagesResponse = await fetch(`/api/chat/sessions/${nextSessions[0]._id}/messages`, { cache: "no-store" });
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
  }, [lawId, authenticated, introMessage, t]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 120;
      isNearBottomRef.current = nearBottom;
      setShowScrollToBottom(!nearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (pendingAssistantFocusRef.current && messages.length > 1 && messages[messages.length - 1].role === "assistant") {
      if (isNearBottomRef.current) {
        latestAssistantRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      pendingAssistantFocusRef.current = false;
    }
  }, [messages]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  async function refreshSessions(selectedId?: string) {
    if (!authenticated) return;
    const response = await fetch("/api/chat/sessions", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.ok) {
      setSessions(json.data.sessions || []);
      if (selectedId) setActiveSessionId(selectedId);
    }
  }

  async function openSession(sessionId: string) {
    if (!authenticated) return;
    setError(null);
    setLastFailedPrompt(null);
    setActiveSessionId(sessionId);
    const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, { cache: "no-store" });
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
    setError(null);
    setLastFailedPrompt(null);
    setMessage("");
    setMessages([introMessage]);
    setActiveSessionId(null);
    if (!authenticated) return;

    const response = await fetch("/api/chat/sessions", {
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
    const response = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
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
    if (!clean || loading) return;

    setError(null);
    setShowLoginCta(false);
    setMessage("");
    setMessages((items) => {
      const last = items[items.length - 1];
      if (last?.role === "user" && last.content === clean) return items;
      return [...items, { role: "user", content: clean }];
    });
    setLoading(true);
    window.requestAnimationFrame(() => {
      latestUserRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      scrollToBottom();
    });

    const url = authenticated && activeSessionId ? `/api/chat/sessions/${activeSessionId}/messages` : lawId ? `/api/chat/law/${lawId}` : "/api/chat";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-nashmi-language": language },
      body: JSON.stringify({
        message: clean,
        lawId,
        language,
        sessionId: authenticated ? activeSessionId || undefined : undefined,
        history: !authenticated ? messages.slice(-8).map((item) => ({ role: item.role, content: item.content })) : undefined
      })
    });
    const json = await response.json().catch(() => ({}));
    setLoading(false);

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
      pendingAssistantFocusRef.current = true;
      // Do NOT append backend/internal error text as a chat bubble. Errors
      // are shown via the error banner above.
      return;
    }

    if (json.data.usage) setUsage(json.data.usage);
    if (authenticated && json.data.session?._id) {
      setActiveSessionId(json.data.session._id);
      await refreshSessions(json.data.session._id);
    }
    pendingAssistantFocusRef.current = true;
    setMessages((items) => [...items, json.data.message]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(message);
  }

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-4 lg:grid-cols-[280px_1fr]" dir={dir}>
      <aside className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-soft dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-line p-3 dark:border-slate-700">
          <h2 className="text-sm font-bold text-ink dark:text-white">{t("chat.conversations")}</h2>
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
        <div className="max-h-[calc(100vh-16rem)] space-y-2 overflow-auto p-2">
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-soft dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-civic/5 p-4 dark:border-slate-700 dark:bg-slate-900/70 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">{activeSession?.title || t("chat.newConversation")}</h2>
            <p className="mt-1 text-xs font-semibold text-civic dark:text-emerald-200">{t("chat.ready")}</p>
            {usage ? (
              <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("chat.remaining")} {formatNumber(usage.remaining, language)} {t("chat.remainingMessages")}
              </p>
            ) : null}
          </div>
          {activeSessionId ? (
            <button
              type="button"
              onClick={deleteConversation}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-slate-700 dark:text-red-300 dark:hover:bg-red-950/40"
              title={language === "en" ? "Delete conversation" : "حذف المحادثة"}
              aria-label={language === "en" ? "Delete conversation" : "حذف المحادثة"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {usage?.subjectType === "guest" ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-civic dark:border-emerald-200/20 dark:bg-emerald-200/10 dark:text-emerald-100">
            {t("chat.guestCta")} <Link href="/login" className="font-black underline">{t("chat.loginCta")}</Link>
          </div>
        ) : null}

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

        <div className="relative">
          <div ref={scrollRef} className="assistant-scrollbar h-[min(560px,calc(100vh-18rem))] space-y-4 overflow-auto bg-slate-50 p-4 dark:bg-[#071217]" aria-live="polite">
            {messages.map((item, index) => (
              <div key={item._id || `${item.role}-${index}`} dir="ltr" className={`flex items-end gap-2 ${item.role === "user" ? "justify-end [&>:first-child]:order-2 [&>:last-child]:order-1" : "justify-start"}`}>
                <ChatAvatar role={item.role} name={item.role === "user" ? currentUser?.name : "Nashmi AI"} imageUrl={item.role === "user" ? userAvatarUrl(currentUser) : null} />
                <div
                  ref={item.role === "user" && index === messages.length - 1 ? latestUserRef : item.role === "assistant" && index === messages.length - 1 ? latestAssistantRef : null}
                  dir={dir}
                  className={`min-w-0 max-w-[78%] rounded-2xl p-4 text-start leading-8 shadow-sm sm:max-w-[84%] ${item.role === "user" ? "rounded-br-md bg-civic text-white dark:bg-[#1b8f89]" : "rounded-bl-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}
                >
                  {item.role === "assistant" ? <MarkdownMessage content={item.content} /> : <div className="whitespace-pre-wrap break-words text-white">{item.content}</div>}
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
              <div className="rounded border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
                <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-200">{language === "en" ? "Suggested questions" : "أسئلة مقترحة"}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions[language].map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-civic hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-300 dark:hover:text-emerald-200"
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

          {showScrollToBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-4 left-4 z-10 rounded-full bg-civic p-2 text-white shadow-lg transition hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 active:scale-95 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
              aria-label={t("chat.scrollBottom")}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/95">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            maxLength={1500}
            placeholder={t("chat.placeholder")}
            disabled={loading}
            aria-label={t("chat.inputLabel")}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-civic text-white shadow-sm transition duration-200 hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
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
