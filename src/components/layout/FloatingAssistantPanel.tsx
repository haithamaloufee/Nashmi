"use client";

import { FormEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, MoveVertical, Send, Sparkles, X } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import TypingIndicator from "@/components/chat/TypingIndicator";
import MessageInput from "@/components/chat/MessageInput";
import { useMobileAssistantScrollLock, useVisibleViewport } from "@/components/chat/useVisibleViewport";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { formatNumber } from "@/lib/localization";
import { cleanAssistantContent } from "@/lib/chatDisplay";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Usage = {
  subjectType: "guest" | "user";
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

type AssistantUser = {
  name?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  profileImage?: string | null;
} | null;

const DEFAULT_PANEL_HEIGHT = 560;
const MIN_PANEL_HEIGHT = 340;
const DEFAULT_BOTTOM_OFFSET = 16;
const MarkdownMessage = dynamic(() => import("@/components/chat/MarkdownMessage"), { ssr: false });

function fallbackError(json: unknown, fallback: string, tFunc: (k: any) => string) {
  if (typeof json === "object" && json !== null && "error" in json) {
    const error = (json as { error?: { message?: string; code?: string; messageKey?: string } }).error || {};
    if (error.messageKey) return tFunc(error.messageKey);
    if (error.code === "MESSAGE_TOO_LONG") return tFunc("chat.errors.messageTooLong");
    if (error.code === "PAYLOAD_TOO_LARGE") return tFunc("chat.errors.payloadTooLarge");
    if (error.code === "RATE_LIMITED" && (error as any).messageKey) return tFunc((error as any).messageKey);
    if (typeof error.message === "string" && error.message.trim()) return error.message;
  }
  return fallback;
}

function userAvatarUrl(user: AssistantUser) {
  return user?.avatarUrl || user?.image || user?.imageUrl || user?.profileImage || null;
}

export default function FloatingAssistantPanel({ onClose, initialBottomOffset, onBottomOffsetChange, dock = "left" }: { onClose: () => void; initialBottomOffset: number; onBottomOffsetChange: (offset: number) => void; dock?: "left" | "right" }) {
  const { dir, language, t } = useTranslation();
  const pathname = usePathname();
  const open = true;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: t("chat.welcome") }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLoginCta, setShowLoginCta] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [currentUser, setCurrentUser] = useState<AssistantUser>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [bottomOffset, setBottomOffset] = useState(initialBottomOffset);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const latestAssistantRef = useRef<HTMLDivElement | null>(null);
  const latestUserRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const pendingAssistantFocusRef = useRef(false);
  useEffect(() => onBottomOffsetChange(bottomOffset), [bottomOffset, onBottomOffsetChange]);

  const hidden = pathname === "/chat" || pathname?.startsWith("/login") || pathname?.startsWith("/signup");
  const visibleViewport = useVisibleViewport(open && !hidden);
  useMobileAssistantScrollLock(open && !hidden);

  const getSafeTop = useCallback(() => {
    if (typeof window === "undefined") return 88;
    const headerHeight = document.querySelector("header")?.getBoundingClientRect().height || 64;
    return Math.ceil(headerHeight + 12);
  }, []);

  const clampPanelHeight = useCallback((value: number) => {
    if (typeof window === "undefined") return value;
    // Keep the requested desktop size; the displayed size independently fits the keyboard viewport.
    return Math.min(Math.max(value, MIN_PANEL_HEIGHT), 720);
  }, []);

  const clampBottomOffset = useCallback((value: number, elementHeight = panelHeight) => {
    if (typeof window === "undefined") return value;
    const availableHeight = visibleViewport?.height ?? window.innerHeight;
    const topClearance = Math.max(8, getSafeTop() - (visibleViewport?.top ?? 0));
    const maxOffset = Math.max(DEFAULT_BOTTOM_OFFSET, availableHeight - elementHeight - topClearance);
    return Math.min(Math.max(value, DEFAULT_BOTTOM_OFFSET), maxOffset);
  }, [getSafeTop, panelHeight, visibleViewport]);

  useEffect(() => {
    setMessages((items) => (items.length === 1 && items[0]?.role === "assistant" ? [{ role: "assistant", content: t("chat.welcome") }] : items));
  }, [t]);

  useEffect(() => {
    if (!open) return;
    setSessionId(null);
    setMessages([{ role: "assistant", content: t("chat.welcome") }]);
    setInput("");
    setError("");
    setShowLoginCta(false);
    setShowScrollToBottom(false);
    // Opening the panel should not summon the phone keyboard or pan away from its header.
    if (window.matchMedia("(min-width: 640px)").matches) {
      const timeout = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
      return () => window.clearTimeout(timeout);
    }
  }, [open, t]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadUsage() {
      const response = await fetch("/api/chat", { cache: "no-store", headers: { "x-nashmi-language": language } });
      const json = await response.json().catch(() => ({}));
      if (!cancelled && response.ok && json.ok) setUsage(json.data.usage);
    }
    void loadUsage().catch(() => { if (!cancelled) setError(t("chat.connectionError")); });
    return () => {
      cancelled = true;
    };
  }, [language, open, t]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadCurrentUser() {
      setCurrentUserLoading(true);
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        if (!cancelled) setCurrentUser(response.ok && json.ok ? json.data.user : null);
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setCurrentUserLoading(false);
      }
    }
    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
  const visibleHeight = visibleViewport?.height ?? (typeof window === "undefined" ? 760 : window.innerHeight);
  const topClearance = Math.max(8, getSafeTop() - (visibleViewport?.top ?? 0));
  const displayedHeight = Math.max(0, Math.min(panelHeight, visibleHeight - topClearance - DEFAULT_BOTTOM_OFFSET));
  const displayedOffset = clampBottomOffset(bottomOffset, open ? displayedHeight : 64);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || loading) return;

    setError("");
    setShowLoginCta(false);
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
        headers: { "Content-Type": "application/json", "x-nashmi-language": language },
        body: JSON.stringify({
          message: clean,
          sessionId: sessionId || undefined,
          language,
          history: messages.slice(-8).map((item) => ({ role: item.role, content: item.content }))
        })
      });
      const json = await response.json().catch(() => ({}));
        if (!response.ok || !json.ok) {
        const friendly = fallbackError(json, t("chat.error"), t);
        const usageData = json.error?.usage as Usage | undefined;
        if (usageData) setUsage(usageData);
        setShowLoginCta(json.error?.messageKey === "chat.limit.guestReached");
        setError(friendly);
        setInput(current => current || clean);
        return;
      }
      setSessionId(json.data.session?._id || null);
      if (json.data.usage) setUsage(json.data.usage);
      pendingAssistantFocusRef.current = true;
      setMessages((items) => [...items, { role: "assistant", content: json.data.message?.content || t("chat.welcome") }]);
    } catch {
      const friendly = t("chat.connectionError");
      setError(friendly);
      setInput(current => current || clean);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`floating-assistant fixed z-40 flex max-w-[calc(100vw-1rem)] justify-start print:hidden ${dock === "left" ? "left-2 right-auto sm:left-6" : "right-2 left-auto sm:right-6"}`} style={{ bottom: displayedOffset + (open ? visibleViewport?.bottomInset ?? 0 : 0) }}>
        <section
          className="flex min-h-0 w-[calc(100vw-1rem)] max-w-[400px] flex-col overscroll-none overflow-hidden rounded-3xl border border-slate-200/80 bg-white text-slate-900 shadow-[0_24px_70px_rgba(5,18,22,.28)] ring-1 ring-white/60 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100 dark:ring-slate-700 sm:w-[400px]"
          style={{ height: displayedHeight }}
          aria-label={t("nav.chat")}
          dir={dir}
        >
          <button
            type="button"
            onPointerDown={startResize}
            className="hidden h-4 w-full cursor-ns-resize touch-none items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-civic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-emerald-200 sm:flex"
            aria-label={t("chat.resize")}
            title={t("chat.resize")}
          >
            <span className="h-1 w-12 rounded-full bg-current" />
          </button>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[linear-gradient(135deg,#0f555a,#10252b)] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.12] ring-1 ring-white/[0.16]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black leading-6">{t("nav.chat")}</h2>
                {usage ? (
                  <p className="mt-0.5 text-xs font-semibold text-white/[0.72]">
                    {t("chat.remaining")} {formatNumber(usage.remaining, language)} {t("chat.remainingMessages")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onPointerDown={startVerticalDrag} className="focus-ring grid h-9 w-9 touch-none place-items-center rounded-full text-white/90 hover:bg-white/[0.15] hover:text-white active:scale-95" aria-label={t("chat.move")} title={t("chat.move")}>
                <MoveVertical className="h-4 w-4" />
              </button>
              <button type="button" onClick={onClose} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/[0.15] hover:text-white active:scale-95" aria-label={t("chat.close")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {usage?.subjectType === "guest" ? (
            <div className="shrink-0 border-b border-line bg-emerald-50 px-4 py-2 text-xs font-semibold leading-5 text-civic dark:border-slate-700 dark:bg-emerald-200/10 dark:text-emerald-100">
              {t("chat.guestCta")} <Link href="/login" className="font-black underline">{t("chat.loginCta")}</Link>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1">
            <div ref={messagesRef} tabIndex={0} role="log" aria-label={t("nav.chat")} className="assistant-scrollbar focus-ring h-full touch-pan-y space-y-3 overscroll-contain overflow-auto bg-[#f5f7f6] p-3.5 dark:bg-[#101820]" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} dir="ltr" className={`flex items-end gap-2 ${message.role === "user" ? "justify-end [&>:first-child]:order-2 [&>:last-child]:order-1" : "justify-start"}`}>
                  <ChatAvatar role={message.role} name={message.role === "user" ? currentUser?.name : "Nashmi AI"} imageUrl={message.role === "user" ? userAvatarUrl(currentUser) : null} loading={message.role === "user" && currentUserLoading} compact />
                  <div
                    ref={message.role === "user" && index === messages.length - 1 ? latestUserRef : message.role === "assistant" && index === messages.length - 1 ? latestAssistantRef : null}
                    dir={dir}
                    className={`min-w-0 max-w-[82%] rounded-2xl px-4 py-2.5 text-start text-sm leading-7 shadow-sm sm:max-w-[86%] ${message.role === "user" ? "rounded-br-md bg-civic text-white dark:bg-emerald-200 dark:text-slate-950" : "rounded-bl-md border border-slate-200/80 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={cleanAssistantContent(message.content)} />
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    )}
                  </div>
                </div>
              ))}
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
                className="absolute bottom-4 left-4 z-10 rounded-full bg-civic p-2 text-white shadow-lg transition hover:bg-civic/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic focus-visible:ring-offset-2 active:scale-95 dark:bg-emerald-200 dark:text-slate-950 dark:hover:bg-emerald-100"
                aria-label={t("chat.scrollBottom")}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}
          </div>

          {error ? (
            <div className="border-t border-line bg-red-50 px-4 py-3 text-sm leading-7 text-red-700 dark:border-slate-700 dark:bg-red-950/30 dark:text-red-200">
              {error}{" "}
              {showLoginCta ? <Link href="/login" className="font-bold underline">{t("chat.loginCta")}</Link> : null}
            </div>
          ) : null}

          <form onSubmit={sendMessage} autoComplete="off" className="flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-950/95">
            <MessageInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              placeholder={t("chat.placeholder")}
              disabled={loading}
              label={t("chat.inputLabel")}
            />
            <button type="submit" disabled={loading || !input.trim()} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-civic text-white shadow-sm hover:bg-civic/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-emerald-200 dark:text-slate-950 dark:hover:bg-emerald-100" aria-label={t("chat.send")}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
    </div>
  );
}
