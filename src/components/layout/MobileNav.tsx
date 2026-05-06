"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type MobileNavProps = {
  links: Array<{ href: string; label: string }>;
  dashboardHref?: string | null;
};

export default function MobileNav({ links, dashboardHref }: MobileNavProps) {
  const pathname = usePathname();
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

  const mobileLinks = dashboardHref ? [...links, { href: dashboardHref, label: "لوحة التحكم" }] : links;
  const Icon = open ? X : Menu;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded border border-line bg-white/70 text-ink hover:border-civic hover:text-civic active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-300 dark:hover:text-emerald-100"
        aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <Icon className="h-5 w-5" />
      </button>

      {open ? (
        <div id="mobile-navigation" className="absolute inset-x-0 top-full z-50 border-b border-line bg-paper/98 px-4 pb-4 pt-2 shadow-soft dark:border-slate-700 dark:bg-slate-950/95 sm:backdrop-blur">
          <nav className="grid gap-2 text-sm font-semibold" aria-label="التنقل المختصر">
            {mobileLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`focus-ring rounded border px-3 py-3 text-center ${
                    active
                      ? "border-civic bg-civic text-white dark:border-emerald-200 dark:bg-emerald-200 dark:text-[#101820]"
                      : "border-line bg-white/70 text-ink/78 hover:border-civic hover:text-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-300 dark:hover:bg-slate-800 dark:hover:text-emerald-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
