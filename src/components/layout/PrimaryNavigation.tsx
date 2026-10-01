"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Landmark, BookOpen } from "lucide-react";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";
export default function PrimaryNavigation({ links }: { links: Array<{href: string; labelKey: TranslationKey}> }) {
  const path = usePathname();
  const { t } = useTranslation();
  const icons = [Home, BookOpen, Landmark];
  return <nav className="order-last flex h-11 min-w-0 basis-full items-stretch justify-center gap-1 lg:order-none lg:h-14 lg:flex-1 lg:basis-auto" aria-label="التنقل الرئيسي">
    {links.map((link, index) => { const Icon = icons[index]; const active = path === link.href || path.startsWith(link.href + "/");
      return <Link key={link.href} href={link.href} prefetch={false} data-navbar-prefetch={link.href} aria-current={active ? "page" : undefined} title={t(link.labelKey)} className={"nav-tab focus-ring " + (active ? "nav-tab-active" : "")}>
        <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={active ? 2.5 : 1.8}/><span className="sr-only text-xs font-bold lg:not-sr-only">{t(link.labelKey)}</span>
      </Link>;
    })}
  </nav>;
}
