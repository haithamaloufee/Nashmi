"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const introMessage: Message = {
  role: "assistant",
  content: "مرحبا، أنا مساعد نشمي الذكي. اسألني عن القوانين أو الأحزاب أو طريقة استخدام المنصة."
};

function fallbackError(json: unknown) {
  if (typeof json === "object" && json !== null && "error" in json) {
    const message = (json as { error?: { message?: string } }).error?.message;
    if (message) return message;
  }
  return "تعذر إرسال الرسالة الآن. حاول مرة أخرى بعد قليل.";
}

export default function FloatingAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([introMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const hidden = pathname === "/chat" || pathname?.startsWith("/login") || pathname?.startsWith("/signup");

  useEffect(() => {
    if (!open) return;
    setSessionId(null);
    setMessages([introMessage]);
    setInput("");
    setError("");
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (hidden) return null;

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;

    setError("");
    setInput("");
    setMessages((items) => [...items, { role: "user", content: clean }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, sessionId: sessionId || undefined })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        const friendly = response.status === 401 ? "سجل الدخول لاستخدام المساعد الذكي من هذه النافذة." : fallbackError(json);
        setError(friendly);
        setMessages((items) => [...items, { role: "assistant", content: friendly }]);
        return;
      }
      setSessionId(json.data.session?._id || null);
      setMessages((items) => [...items, { role: "assistant", content: json.data.message?.content || "تم استلام رسالتك." }]);
    } catch {
      const friendly = "تعذر الاتصال بالمساعد. تحقق من الاتصال وحاول مجددا.";
      setError(friendly);
      setMessages((items) => [...items, { role: "assistant", content: friendly }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open ? (
        <section
          className="flex h-[min(640px,calc(100vh-3.5rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-white text-ink shadow-soft dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100"
          aria-label="المساعد الذكي المصغر"
          dir="rtl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line bg-civic px-4 py-3.5 text-white dark:border-slate-700 dark:bg-[#126b6f]">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900/80 ring-1 ring-slate-700">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black leading-6">المساعد الذكي</h2>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-white/78">محادثة جديدة</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15 hover:text-white active:scale-95" aria-label="إغلاق المساعد">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={messagesRef} className="assistant-scrollbar flex-1 space-y-4 overflow-auto bg-paper p-4 dark:bg-[#101820]">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[90%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-8 shadow-sm ${message.role === "user" ? "rounded-tr-3xl bg-civic text-white dark:bg-[#1b8f89]" : "rounded-tl-3xl border border-line bg-white text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-civic shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  يكتب...
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="border-t border-line bg-red-50 px-4 py-3 text-sm leading-7 text-red-700 dark:border-slate-700 dark:bg-red-950/30 dark:text-red-200">
              {error}{" "}
              {error.includes("سجل الدخول") ? (
                <Link href="/login" className="font-bold underline">
                  تسجيل الدخول
                </Link>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-line bg-white p-3.5 dark:border-slate-700 dark:bg-slate-950/95">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 rounded-full border-line px-4 text-sm leading-6 focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="اكتب سؤالك..."
              maxLength={1200}
              disabled={loading}
              aria-label="رسالة إلى المساعد الذكي"
            />
            <button type="submit" disabled={loading || !input.trim()} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic text-white shadow-sm hover:bg-civic/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]" aria-label="إرسال الرسالة">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-civic px-4 py-3 font-semibold text-white shadow-soft ring-1 ring-white/25 transition hover:bg-civic/90 active:scale-95 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
          aria-label="فتح المساعد الذكي"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/15 dark:bg-slate-900/80">
            <Bot className="h-5 w-5" />
            <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-white" />
          </span>
          <span className="hidden text-sm sm:inline">المساعد الذكي</span>
        </button>
      )}
    </div>
  );
}
