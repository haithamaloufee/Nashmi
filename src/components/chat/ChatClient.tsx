"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Loader2, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

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

const introMessage: Message = {
  role: "assistant",
  content: "أنا مساعد منصة نشمي الذكي. أقدر أساعدك تفهم القوانين والانتخابات والأحزاب بطريقة مبسطة ومحايدة."
};

const suggestedQuestions = [
  "ما هو حق تأسيس الأحزاب في الأردن؟",
  "ما دور الهيئة المستقلة للانتخاب؟",
  "كيف أقدر أقارن بين برامج الأحزاب بطريقة حيادية؟",
  "ما هي حقوق الشباب في المشاركة السياسية؟",
  "اشرح لي قانون الأحزاب بطريقة بسيطة.",
  "ما الفرق بين الحزب والكتلة الانتخابية؟",
  "كيف أتابع أخبار حزب معين داخل منصة نشمي؟",
  "كيف أقدم بلاغ عن محتوى مخالف؟",
  "ما الشروط العامة للانتساب إلى حزب؟",
  "ما معنى أن تكون الإجابة توعوية وليست استشارة قانونية؟"
];

function fallbackError(json: unknown) {
  if (typeof json === "object" && json !== null && "error" in json) {
    const error = (json as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return "تعذر الحصول على رد الآن، حاول مرة أخرى بعد قليل.";
}

function sourceLabel(sourceType: string) {
  if (sourceType === "google_search") return "مصدر ويب";
  return "مصدر من نشمي";
}

export default function ChatClient({ lawId, authenticated }: { lawId?: string; authenticated: boolean }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [message, setMessage] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(() => sessions.find((session) => session._id === activeSessionId) || null, [sessions, activeSessionId]);
  const showSuggestions = !loading && messages.length === 1 && messages[0]?.role === "assistant";

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      if (!authenticated) {
        setSessionsLoading(false);
        setLoginOpen(true);
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
        setError(fallbackError(json));
        return;
      }
      const nextSessions = json.data.sessions || [];
      setSessions(nextSessions);
      if (!lawId && nextSessions[0]?._id) void openSession(nextSessions[0]._id);
    }
    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [lawId, authenticated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function refreshSessions(selectedId?: string) {
    const response = await fetch("/api/chat/sessions", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.ok) {
      setSessions(json.data.sessions || []);
      if (selectedId) setActiveSessionId(selectedId);
    }
  }

  async function openSession(sessionId: string) {
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
      setError(fallbackError(json));
      return;
    }
    setMessages(json.data.messages?.length ? json.data.messages : [introMessage]);
  }

  async function newConversation() {
    setError(null);
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "محادثة جديدة" })
    });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!response.ok || !json.ok) {
      setError(fallbackError(json));
      return;
    }
    const session = json.data.session as Session;
    setActiveSessionId(session._id);
    setMessages([introMessage]);
    await refreshSessions(session._id);
  }

  async function deleteConversation() {
    if (!activeSessionId) return;
    await deleteSession(activeSessionId);
  }

  async function deleteSession(sessionId: string) {
    if (!window.confirm("هل أنت متأكد من حذف هذه المحادثة؟")) return;

    setError(null);
    const response = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setLoginOpen(true);
      return;
    }
    if (!response.ok || !json.ok) {
      setError(fallbackError(json));
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
    setMessage("");
    setMessages((items) => [...items, { role: "user", content: clean }]);
    setLoading(true);

    const url = activeSessionId ? `/api/chat/sessions/${activeSessionId}/messages` : lawId ? `/api/chat/law/${lawId}` : "/api/chat";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: clean, lawId, sessionId: activeSessionId || undefined })
    });
    const json = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.status === 401) {
      setLoginOpen(true);
      setMessages((items) => items.filter((item) => item.content !== clean || item.role !== "user"));
      return;
    }

    if (!response.ok || !json.ok) {
      const friendlyError = fallbackError(json);
      setError(friendlyError);
      setLastFailedPrompt(clean);
      setMessages((items) => [...items, { role: "assistant", content: friendlyError }]);
      return;
    }

    setActiveSessionId(json.data.session._id);
    setMessages((items) => [...items, json.data.message]);
    await refreshSessions(json.data.session._id);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(message);
  }

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-4 lg:grid-cols-[280px_1fr]" dir="rtl">
      <aside className="rounded-3xl border border-line bg-white/95 shadow-soft dark:border-slate-700 dark:bg-slate-950/95">
        <div className="flex items-center justify-between border-b border-line p-3 dark:border-slate-700">
          <h2 className="text-sm font-bold text-ink dark:text-white">المحادثات</h2>
          <button
            type="button"
            onClick={newConversation}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-civic transition duration-200 hover:border-civic hover:bg-civic/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 dark:border-slate-700"
            title="محادثة جديدة"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-16rem)] space-y-2 overflow-auto p-2">
          {sessionsLoading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-ink/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              جار تحميل المحادثات
            </div>
          ) : null}
          {!sessionsLoading && sessions.length === 0 ? <p className="p-3 text-sm text-ink/60">لا توجد محادثات محفوظة بعد.</p> : null}
          {sessions.map((session) => (
            <div
              key={session._id}
              className={`group flex items-center gap-1 rounded-xl px-1 transition duration-200 ${
                session._id === activeSessionId ? "bg-civic/10 font-bold text-civic" : "text-ink hover:bg-civic/10"
              }`}
            >
              <button type="button" onClick={() => openSession(session._id)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-right text-sm">
                {session.status === "archived" ? <Archive className="h-4 w-4 shrink-0" /> : <MessageSquare className="h-4 w-4 shrink-0" />}
              <span className="truncate">{session.title || "محادثة جديدة"}</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteSession(session._id);
                }}
                className="ms-1 me-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink/45 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                aria-label="حذف المحادثة"
                title="حذف المحادثة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft dark:border-slate-700 dark:bg-slate-950/95">
        <div className="flex flex-col gap-3 border-b border-line bg-civic/5 p-4 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-ink">{activeSession?.title || "محادثة جديدة"}</h2>
            <p className="mt-1 text-xs text-civic">متصل وجاهز للمساعدة التوعوية</p>
          </div>
          {activeSessionId ? (
            <button
              type="button"
              onClick={deleteConversation}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-line text-red-600 hover:bg-red-50"
              title="حذف المحادثة"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>
            {lastFailedPrompt ? (
              <button type="button" onClick={() => sendMessage(lastFailedPrompt)} className="rounded bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100">
                إعادة المحاولة
              </button>
            ) : null}
          </div>
        ) : null}

        <div ref={scrollRef} className="h-[min(520px,calc(100vh-18rem))] space-y-4 overflow-auto bg-[#f4f7f4] p-4 dark:bg-[#071217]">
          {messages.map((item, index) => (
            <div key={item._id || `${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[88%] rounded-3xl p-4 leading-8 shadow-sm ${item.role === "user" ? "rounded-tr-3xl bg-civic text-white" : "rounded-tl-3xl border border-line bg-white text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}>
                {item.role === "assistant" ? <MarkdownMessage content={item.content} /> : <div className="whitespace-pre-wrap text-ink dark:text-slate-100">{item.content}</div>}
                {item.role === "assistant" && item.groundingSources?.length ? (
                  <div className="mt-3 border-t border-line pt-2 text-xs dark:border-slate-700">
                    <p className="mb-1 font-bold text-ink/70 dark:text-slate-300">المصادر</p>
                    <div className="space-y-1">
                      {item.groundingSources.map((source, sourceIndex) => (
                        <a
                          key={`${source.title}-${sourceIndex}`}
                          href={source.url || "#"}
                          target={source.url?.startsWith("http") ? "_blank" : undefined}
                          rel={source.url?.startsWith("http") ? "noreferrer" : undefined}
                          className="block text-civic underline-offset-4 hover:underline"
                        >
                          <span className="text-ink/50">[{sourceLabel(source.sourceType)}]</span> {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {showSuggestions ? (
            <div className="rounded border border-line bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100">
              <p className="mb-3 text-sm font-bold text-ink/70 dark:text-slate-200">أسئلة مقترحة</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    className="rounded border border-line px-3 py-2 text-sm text-ink hover:border-civic hover:text-civic"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-civic shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="h-2 w-2 animate-pulse rounded-full bg-civic" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-civic [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-civic [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-950/95">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-line bg-white/95 px-4 py-3 text-sm focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            maxLength={1200}
            placeholder="اسأل عن قانون، انتخابات، أحزاب، أو طريقة استخدام المنصة"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-civic text-white shadow-sm transition duration-200 hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
            aria-label="إرسال الرسالة"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>

      <LoginPrompt open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
