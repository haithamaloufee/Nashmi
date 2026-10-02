"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";

// History, message rendering and viewport listeners load only after explicit opening.
const AssistantPanel = dynamic(() => import("./FloatingAssistantPanel"), { ssr: false });

function clampBottom(offset: number) {
  const headerHeight = document.querySelector("header")?.getBoundingClientRect().height || 64;
  return Math.min(Math.max(16, window.innerHeight - headerHeight - 72), Math.max(16, offset));
}

export default function FloatingAssistant() {
  const pathname = usePathname();
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(16);
  const [dock, setDock] = useState<"left" | "right">("left");
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; bottom: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
  }, []);
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.getBoundingClientRect().left, bottom: bottomOffset, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    start.moved = true;
    setDragLeft(Math.max(8, Math.min(window.innerWidth - 64, start.left + dx)));
    setBottomOffset(clampBottom(start.bottom - dy));
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start) return;
    if (start.moved) {
      const center = start.left + event.clientX - start.x + 28;
      setDock(center < window.innerWidth / 2 ? "left" : "right");
      suppressClick.current = true;
    } else if (event.type === "pointerup" && event.pointerType === "touch") {
      // A touch tap need not synthesize a mouse click after pointer capture.
      event.preventDefault();
      setOpen(true);
    }
    drag.current = null;
    setDragLeft(null);
  }
  useEffect(() => {
    const resize = () => setBottomOffset(offset => clampBottom(offset));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const hidden = pathname === "/chat" || pathname.startsWith("/login") || pathname.startsWith("/signup");
  if (hidden || dismissed) return null;
  if (open) return <AssistantPanel onClose={close} initialBottomOffset={bottomOffset} onBottomOffsetChange={setBottomOffset} dock={dock} />;
  const hideLabel = language === "en" ? "Hide assistant until refresh" : "إخفاء المساعد حتى إعادة تحميل الصفحة";
  return <div className={`floating-assistant fixed z-40 max-w-[calc(100vw-1rem)] print:hidden ${dock === "left" ? "left-2 sm:left-6" : "right-2 sm:right-6"}`} style={{ bottom: bottomOffset, ...(dragLeft !== null ? { left: dragLeft, right: "auto" } : {}) }}>
    <button type="button" onClick={() => setDismissed(true)} aria-label={hideLabel} title={hideLabel} data-compact-control="true" className={`focus-ring absolute ${dock === "left" ? "-right-2" : "-left-2"} -top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-line bg-paper text-ink shadow-sm hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white`}>
      <X className="h-3.5 w-3.5" />
    </button>
    <button ref={launcherRef} type="button" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onClick={event => {
      if (suppressClick.current && event.detail > 0) { suppressClick.current = false; return; }
      suppressClick.current = false;
      setOpen(true);
    }} onKeyDown={event => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") setDock(event.key === "ArrowLeft" ? "left" : "right");
      else setBottomOffset(offset => clampBottom(offset + (event.key === "ArrowUp" ? 24 : -24)));
    }} aria-label={t("nav.chat")} title={t("nav.chat")} aria-describedby="assistant-drag-hint" className="focus-ring grid h-14 w-14 touch-none select-none place-items-center rounded-2xl bg-[linear-gradient(135deg,#126b6f,#0f555a)] text-white shadow-[0_12px_34px_rgba(5,18,22,.24)] ring-1 ring-white/25 hover:brightness-110 active:scale-95">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.14]"><Sparkles className="h-6 w-6" aria-hidden="true" /></span>
    </button>
    <span id="assistant-drag-hint" className="sr-only">{language === "en" ? "Drag to either screen edge. Arrow keys move the button; Enter opens the assistant." : "اسحب إلى إحدى حافتي الشاشة. مفاتيح الأسهم تحرك الزر؛ Enter يفتح المساعد."}</span>
  </div>;
}
