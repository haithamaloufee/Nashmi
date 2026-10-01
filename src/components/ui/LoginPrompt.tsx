"use client";
import Link from "next/link";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import { useDialog } from "@/lib/useDialog";
export function LoginPrompt({open, onClose}: {open: boolean; onClose: () => void}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { t, dir } = useTranslation();
  useDialog(open, panel, onClose);
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-[90] grid place-items-center bg-ink/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} dir={dir} className="card w-full max-w-md p-6 outline-none">
      <h2 id={titleId} className="text-xl font-bold">{t("social.loginRequired")}</h2><p className="mt-3 leading-7 text-ink/70">{t("social.loginReason")}</p>
      <div className="mt-5 flex gap-3"><Link href="/login" className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-civic px-4 font-bold text-white">{t("auth.login")}</Link><button type="button" onClick={onClose} className="focus-ring min-h-11 rounded-xl border border-line px-4">{t("common.close")}</button></div>
    </div>
  </div>, document.body);
}
