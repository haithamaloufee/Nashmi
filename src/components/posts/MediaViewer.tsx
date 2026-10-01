"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { useDialog } from "@/lib/useDialog";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { FeedMedia } from "./PostMedia";

export default function MediaViewer({ images, initialIndex, title, onClose }: { images: FeedMedia[]; initialIndex: number; title: string; onClose: () => void }) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  useDialog(true, panel, onClose);
  const change = (delta: number) => setIndex(current => (current + delta + images.length) % images.length);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "ArrowRight") { event.preventDefault(); setIndex(current => (current + 1) % images.length); } if (event.key === "ArrowLeft") { event.preventDefault(); setIndex(current => (current - 1 + images.length) % images.length); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [images.length]);
  if (!images[index]) return null;
  return createPortal(<div className="fixed inset-0 z-[100] grid bg-black/90 p-3 sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-label={t("social.imageViewer")} tabIndex={-1} className="flex min-h-0 flex-col rounded-xl bg-slate-950 text-white focus:outline-none">
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="min-w-0 truncate text-sm">{title}</p>
        <button type="button" onClick={onClose} aria-label={t("common.close")} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <SafeImage src={images[index].url} alt={`${title} — ${index + 1}`} className="max-h-full w-full object-contain" sizes="100vw" priority localPrefixes={["/uploads/", "/images/", "/related/"]} fallback={<p>{t("common.error")}</p>} />
      </div>
      <div className="flex items-center justify-center gap-4 p-3" dir="ltr">
        {images.length > 1 ? <button type="button" onClick={() => change(-1)} aria-label={t("social.previousImage")} className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft aria-hidden="true" className="h-5 w-5" /></button> : null}
        <p role="status" aria-live="polite" className="text-sm">{index + 1} / {images.length}</p>
        {images.length > 1 ? <button type="button" onClick={() => change(1)} aria-label={t("social.nextImage")} className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ArrowRight aria-hidden="true" className="h-5 w-5" /></button> : null}
      </div>
    </div>
  </div>, document.body);
}
