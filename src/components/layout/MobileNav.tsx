"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

type MobileNavProps = {
  links: Array<{ href: string; labelKey: TranslationKey }>;
  dashboardHref?: string | null;
};

export default function MobileNav({ links, dashboardHref }: MobileNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const mobileLinks = dashboardHref ? [...links, { href: dashboardHref, labelKey: "nav.dashboard" as const }] : links;
  const Icon = open ? X : Menu;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded border border-line bg-white/70 text-ink hover:border-civic hover:text-civic active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-300 dark:hover:text-emerald-100"
        aria-label={open ? t("nav.menuClose") : t("nav.menuOpen")}
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <Icon className="h-5 w-5" />
      </button>

      {open ? (
        <div id="mobile-navigation" className="absolute inset-x-0 top-full z-50 border-b border-line bg-paper/98 px-4 pb-4 pt-2 shadow-soft dark:border-slate-700 dark:bg-slate-950/95 sm:backdrop-blur">
          <nav className="grid gap-2 text-sm font-semibold" aria-label="التنقل المختصر">
            <div className="flex justify-center py-1">
              <LanguageToggle />
            </div>
            {mobileLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={!link.href.includes("dashboard") && !link.href.startsWith("/admin")}
                  data-navbar-prefetch={!link.href.includes("dashboard") && !link.href.startsWith("/admin") ? link.href : undefined}
                  className={`focus-ring rounded border px-3 py-3 text-center ${
                    active
                      ? "border-civic bg-civic text-white dark:border-emerald-200 dark:bg-emerald-200 dark:text-[#101820]"
                      : "border-line bg-white/70 text-ink/78 hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-300 dark:hover:bg-slate-800 dark:hover:text-emerald-100"
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
