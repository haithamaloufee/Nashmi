"use client";

import { FormEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, Bot, MoveVertical, Send, Sparkles, X } from "lucide-react";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_PANEL_HEIGHT = 620;
const MIN_PANEL_HEIGHT = 360;
const DEFAULT_BOTTOM_OFFSET = 16;

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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [bottomOffset, setBottomOffset] = useState(DEFAULT_BOTTOM_OFFSET);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const latestAssistantRef = useRef<HTMLDivElement | null>(null);
  const latestUserRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const pendingAssistantFocusRef = useRef(false);

  const hidden = pathname === "/chat" || pathname?.startsWith("/login") || pathname?.startsWith("/signup");

  const clampPanelHeight = useCallback((value: number) => {
    if (typeof window === "undefined") return value;
    const maxHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(window.innerHeight * 0.88, 720));
    return Math.min(Math.max(value, MIN_PANEL_HEIGHT), maxHeight);
  }, []);

  const clampBottomOffset = useCallback((value: number, elementHeight = panelHeight) => {
    if (typeof window === "undefined") return value;
    const maxOffset = Math.max(DEFAULT_BOTTOM_OFFSET, window.innerHeight - elementHeight - DEFAULT_BOTTOM_OFFSET);
    return Math.min(Math.max(value, DEFAULT_BOTTOM_OFFSET), maxOffset);
  }, [panelHeight]);

  useEffect(() => {
    if (!open) return;
    setSessionId(null);
    setMessages([introMessage]);
    setInput("");
    setError("");
    setShowScrollToBottom(false);
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
    const container = messagesRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      isNearBottomRef.current = nearBottom;
      setShowScrollToBottom(!nearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [open]);

  useEffect(() => {
    if (pendingAssistantFocusRef.current && messages.length > 1 && messages[messages.length - 1].role === "assistant") {
      if (isNearBottomRef.current) {
        latestAssistantRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      pendingAssistantFocusRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      setPanelHeight((height) => clampPanelHeight(height));
      setBottomOffset((offset) => clampBottomOffset(offset, open ? panelHeight : 64));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampBottomOffset, clampPanelHeight, open, panelHeight]);

  const scrollToBottom = () => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  };

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panelHeight;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      setPanelHeight(clampPanelHeight(startHeight + startY - moveEvent.clientY));
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function startVerticalDrag(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startBottom = bottomOffset;
    const draggedHeight = open ? panelHeight : 64;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      setBottomOffset(clampBottomOffset(startBottom - deltaY, draggedHeight));
    };

    const stopDrag = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  }

  if (hidden) return null;

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;

    setError("");
    setInput("");
    setMessages((items) => [...items, { role: "user", content: clean }]);
    setLoading(true);
    window.requestAnimationFrame(() => {
      latestUserRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      scrollToBottom();
    });

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
        pendingAssistantFocusRef.current = true;
        setMessages((items) => [...items, { role: "assistant", content: friendly }]);
        return;
      }
      setSessionId(json.data.session?._id || null);
      pendingAssistantFocusRef.current = true;
      setMessages((items) => [...items, { role: "assistant", content: json.data.message?.content || "تم استلام رسالتك." }]);
    } catch {
      const friendly = "تعذر الاتصال بالمساعد. تحقق من الاتصال وحاول مجددا.";
      setError(friendly);
      pendingAssistantFocusRef.current = true;
      setMessages((items) => [...items, { role: "assistant", content: friendly }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed left-2 right-auto z-40 flex max-w-[calc(100vw-1rem)] justify-start print:hidden sm:left-6" style={{ bottom: bottomOffset }}>
      {open ? (
        <section
          className="flex min-h-[360px] w-[calc(100vw-1rem)] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-soft dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100 sm:w-[420px]"
          style={{ height: `min(${panelHeight}px, calc(100vh - 2rem))` }}
          aria-label="المساعد الذكي المصغر"
          dir="rtl"
        >
          <button
            type="button"
            onPointerDown={startResize}
            className="hidden h-4 w-full cursor-ns-resize touch-none items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-emerald-200 sm:flex"
            aria-label="تغيير ارتفاع نافذة المساعد"
            title="تغيير الارتفاع"
          >
            <span className="h-1 w-12 rounded-full bg-current" />
          </button>
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
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onPointerDown={startVerticalDrag} className="focus-ring grid h-9 w-9 touch-none place-items-center rounded-full text-white/90 hover:bg-white/15 hover:text-white active:scale-95" aria-label="تحريك نافذة المساعد للأعلى أو الأسفل" title="تحريك النافذة">
                <MoveVertical className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15 hover:text-white active:scale-95" aria-label="إغلاق المساعد">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="relative min-h-0 flex-1">
            <div ref={messagesRef} className="assistant-scrollbar h-full space-y-4 overflow-auto bg-slate-50 p-4 dark:bg-[#101820]">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    ref={message.role === "user" && index === messages.length - 1 ? latestUserRef : message.role === "assistant" && index === messages.length - 1 ? latestAssistantRef : null}
                    className={`min-w-0 max-w-[90%] rounded-3xl px-4 py-3 text-sm leading-8 shadow-sm ${message.role === "user" ? "rounded-tr-3xl bg-civic text-white dark:bg-[#1b8f89]" : "rounded-tl-3xl border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-white">{message.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-end">
                  <TypingIndicator />
                </div>
              ) : null}
            </div>
            {showScrollToBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-4 left-4 z-10 rounded-full bg-civic p-2 text-white shadow-lg transition hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 active:scale-95 dark:bg-[#1b8f89] dark:hover:bg-[#20a59e]"
                aria-label="الانتقال إلى آخر المحادثة"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
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

          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-950/95">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 rounded-full border-slate-300 bg-white px-4 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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
        <div className="inline-flex items-center overflow-hidden rounded-full bg-civic font-semibold text-white shadow-soft ring-1 ring-white/25 dark:bg-[#1b8f89]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="focus-ring inline-flex items-center gap-2 px-4 py-3 transition hover:bg-civic/90 active:scale-95 dark:hover:bg-[#20a59e]"
            aria-label="فتح المساعد الذكي"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/15 dark:bg-slate-900/80">
              <Bot className="h-5 w-5" />
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-white" />
            </span>
            <span className="hidden text-sm sm:inline">المساعد الذكي</span>
          </button>
          <button type="button" onPointerDown={startVerticalDrag} className="focus-ring grid h-14 w-11 touch-none place-items-center border-r border-white/15 text-white/90 hover:bg-white/10" aria-label="تحريك زر المساعد للأعلى أو الأسفل" title="تحريك المساعد">
            <MoveVertical className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
