"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Landmark, BookOpen, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";
export default function PrimaryNavigation({ links }: { links: Array<{href: string; labelKey: TranslationKey}> }) {
  const path = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { t } = useTranslation();
  const icons = [Home, BookOpen, Landmark, Sparkles];
  useEffect(() => setPendingHref(null), [path]);
  useEffect(() => {
    if (!pendingHref) return;
    const timeout = window.setTimeout(() => setPendingHref(null), 12000);
    return () => window.clearTimeout(timeout);
  }, [pendingHref]);
  return <nav className="order-last flex h-11 min-w-0 basis-full items-stretch justify-center gap-1 lg:order-none lg:h-14 lg:flex-1 lg:basis-auto" aria-label="التنقل الرئيسي">
    {links.map((link, index) => { const Icon = icons[index]; const current = path === link.href || path.startsWith(link.href + "/"); const active = pendingHref ? pendingHref === link.href : current;
      return <Link key={link.href} href={link.href} prefetch={false} data-navbar-prefetch={link.href} aria-current={current ? "page" : undefined} aria-label={t(link.labelKey)} title={t(link.labelKey)} className={"nav-tab focus-ring " + (active ? "nav-tab-active" : "")} onClick={event => {
        if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) setPendingHref(link.href);
      }}>
        <Icon aria-hidden="true" className="nav-tab-icon h-6 w-6" strokeWidth={active ? 2.5 : 1.8}/><span aria-hidden="true" className="nav-tab-label font-bold">{t(link.labelKey)}</span>
      </Link>;
    })}
  </nav>;
}
