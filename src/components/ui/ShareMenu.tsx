"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail, Send, Share2, X } from "lucide-react";

type ShareMenuProps = {
  url: string;
  title: string;
  text?: string;
  label?: string;
};

function buildMailto(title: string, url: string, text?: string) {
  const subject = encodeURIComponent(title);
  const body = encodeURIComponent(`${text ? `${text}\n\n` : ""}${url}`);
  return `mailto:?subject=${subject}&body=${body}`;
}

function buildWhatsApp(url: string, text?: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text ? `${text} ` : ""}${url}`)}`;
}

export default function ShareMenu({ url, title, text, label = "مشاركة" }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [shareUrl, setShareUrl] = useState(url);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setShareUrl(url.startsWith("/") ? `${window.location.origin}${url}` : url);
  }, [url]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = shareUrl;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text, url: shareUrl });
      setOpen(false);
    } catch {
      // The user can cancel native share without needing an error state.
    }
  }

  return (
    <div ref={menuRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex w-full items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-civic/10 hover:text-civic active:scale-95 dark:text-white/72 dark:hover:text-emerald-200"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" />
        {label}
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-lg border border-line bg-white p-2 text-sm text-ink shadow-soft dark:border-slate-700 dark:bg-slate-950/95 dark:text-white" role="menu">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="font-bold">مشاركة المنشور</p>
            <button type="button" onClick={() => setOpen(false)} className="focus-ring grid h-7 w-7 place-items-center rounded-full text-ink/55 hover:bg-civic/10 hover:text-civic dark:text-white/64 dark:hover:text-emerald-200" aria-label="إغلاق خيارات المشاركة">
              <X className="h-4 w-4" />
            </button>
          </div>

          {canNativeShare ? (
            <button type="button" onClick={nativeShare} className="focus-ring flex w-full items-center gap-2 rounded px-3 py-2 text-start hover:bg-civic/10 hover:text-civic dark:hover:text-emerald-200" role="menuitem">
              <Share2 className="h-4 w-4" />
              مشاركة من الجهاز
            </button>
          ) : null}

          <button type="button" onClick={copyLink} className="focus-ring flex w-full items-center gap-2 rounded px-3 py-2 text-start hover:bg-civic/10 hover:text-civic dark:hover:text-emerald-200" role="menuitem">
            {copied ? <Check className="h-4 w-4 text-civic dark:text-emerald-200" /> : <Copy className="h-4 w-4" />}
            {copied ? "تم نسخ الرابط" : "نسخ الرابط"}
          </button>

          <a href={buildMailto(title, shareUrl, text)} className="focus-ring flex items-center gap-2 rounded px-3 py-2 hover:bg-civic/10 hover:text-civic dark:hover:text-emerald-200" role="menuitem" onClick={() => setOpen(false)}>
            <Mail className="h-4 w-4" />
            مشاركة عبر البريد
          </a>

          <a href={buildWhatsApp(shareUrl, text)} target="_blank" rel="noopener noreferrer" className="focus-ring flex items-center gap-2 rounded px-3 py-2 hover:bg-civic/10 hover:text-civic dark:hover:text-emerald-200" role="menuitem" onClick={() => setOpen(false)}>
            <Send className="h-4 w-4" />
            مشاركة عبر واتساب
          </a>
        </div>
      ) : null}
    </div>
  );
}
