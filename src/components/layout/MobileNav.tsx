"use client";

import Link from "next/link";
import { Info, Landmark, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type MobileNavProps = {
  links: Array<{ href: string; labelKey: TranslationKey }>;
  dashboardHref?: string | null;
  authenticated?: boolean;
};

export default function MobileNav({ links, dashboardHref, authenticated = false }: MobileNavProps) {
  const pathname = usePathname();
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
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

  const mobileLinks = dashboardHref ? [...links, { href: dashboardHref, labelKey: "nav.dashboard" as const }] : links;
  const Icon = open ? X : Menu;

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.16] bg-white/[0.08] text-white hover:border-emerald-200/[0.45] hover:bg-white/[0.14]"
        aria-label={open ? t("nav.menuClose") : t("nav.menuOpen")}
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <Icon className="h-5 w-5" />
      </button>

      {open ? (
        <div id="mobile-navigation" className="absolute inset-x-0 top-full z-50 border-b border-white/10 bg-[#10252b]/[0.99] px-4 pb-5 pt-3 text-white shadow-2xl backdrop-blur-xl">
          <nav className="mx-auto grid max-w-lg gap-2 text-sm font-bold" aria-label="Mobile navigation">
            {mobileLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  prefetch={!link.href.includes("dashboard") && !link.href.startsWith("/admin")}
                  data-navbar-prefetch={!link.href.includes("dashboard") && !link.href.startsWith("/admin") ? link.href : undefined}
                  className={`focus-ring flex min-h-11 items-center rounded-xl px-4 ${active ? "bg-emerald-200 text-[#10252b]" : "text-white/[0.82] hover:bg-white/10 hover:text-white"}`}
                >
                  {t(link.labelKey)}
                </Link>
              );
            })}

            <div className="my-1 h-px bg-white/10" />
            <Link href="/about-nashmi" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center gap-3 rounded-xl px-4 text-white/[0.76] hover:bg-white/10 hover:text-white">
              <Info className="h-4 w-4 text-emerald-200" />
              {t("nav.aboutNashmi")}
            </Link>
            <Link href="/iec" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center gap-3 rounded-xl px-4 text-white/[0.76] hover:bg-white/10 hover:text-white">
              <Landmark className="h-4 w-4 text-emerald-200" />
              {language === "ar" ? "الهيئة المستقلة للانتخاب" : "Independent Election Commission"}
            </Link>

            <div className="mt-1 flex min-h-14 items-center justify-between gap-3 rounded-xl bg-white/[0.06] p-2.5">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            {!authenticated ? (
              <div className="grid grid-cols-2 gap-2 pt-1 sm:hidden">
                <Link href="/login" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center justify-center rounded-xl border border-white/[0.18] font-bold text-white">{t("auth.login")}</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center justify-center rounded-xl bg-emerald-200 font-black text-[#10252b]">{t("auth.signup")}</Link>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
