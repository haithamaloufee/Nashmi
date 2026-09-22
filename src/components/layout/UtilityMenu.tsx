"use client";

import Link from "next/link";
import { Globe2, Info, Landmark, Settings2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useTranslation } from "@/components/i18n/LanguageProvider";

export default function UtilityMenu() {
  const { language } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.08] text-white/[0.88] hover:border-emerald-200/[0.45] hover:bg-white/[0.14] hover:text-white"
        aria-label={language === "ar" ? "إعدادات العرض واللغة" : "Display and language settings"}
        aria-expanded={open}
        aria-controls="navbar-utility-menu"
      >
        {open ? <X className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
      </button>

      {open ? (
        <div id="navbar-utility-menu" className="absolute end-0 mt-3 w-72 rounded-2xl border border-white/[0.12] bg-[#10252b]/[0.99] p-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          <p className="px-2 pb-2 font-black text-white">{language === "ar" ? "العرض واللغة" : "Display & language"}</p>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-white/[0.06] p-2.5">
            <span className="inline-flex items-center gap-2 text-white/[0.78]"><Globe2 className="h-4 w-4" />{language === "ar" ? "اللغة" : "Language"}</span>
            <LanguageToggle compact />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] p-2.5">
            <span className="text-white/[0.78]">{language === "ar" ? "المظهر" : "Appearance"}</span>
            <ThemeToggle />
          </div>
          <div className="my-3 h-px bg-white/10" />
          <Link href="/about-nashmi" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white">
            <Info className="h-4 w-4 text-emerald-200" />
            {language === "ar" ? "عن نشمي" : "About Nashmi"}
          </Link>
          <Link href="/iec" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white">
            <Landmark className="h-4 w-4 text-emerald-200" />
            {language === "ar" ? "مصادر ومعلومات رسمية" : "Official resources"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
