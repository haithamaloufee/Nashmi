import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "@/components/layout/UserMenu";
import ThemeToggle from "@/components/layout/ThemeToggle";
import MobileNav from "@/components/layout/MobileNav";
import NavbarPrefetcher from "@/components/navigation/NavbarPrefetcher";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { I18nText } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

const links: Array<{ href: string; labelKey: TranslationKey }> = [
  { href: "/", labelKey: "nav.home" },
  { href: "/parties", labelKey: "nav.parties" },
  { href: "/iec", labelKey: "nav.iec" },
  { href: "/updates", labelKey: "nav.updates" },
  { href: "/laws", labelKey: "nav.laws" },
  { href: "/about-nashmi", labelKey: "nav.aboutNashmi" }
];

export default async function Navbar() {
  const user = await getCurrentUser();
  const dashboardHref =
    user?.role === "party"
      ? "/party-dashboard"
      : user?.role === "iec"
        ? "/iec-dashboard"
        : user?.role === "admin" || user?.role === "super_admin"
          ? "/admin"
          : null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 text-ink shadow-sm backdrop-blur dark:border-slate-700 dark:bg-[#101820]/95 dark:text-white">
      <div className="container-page flex min-h-16 items-center justify-between gap-3 py-2">
        <NavbarPrefetcher routes={links.map((link) => link.href)} />
        <Link href="/" prefetch data-navbar-prefetch="/" className="focus-ring flex shrink-0 items-center gap-3 font-bold text-civic dark:text-emerald-200" aria-label="Nashmi home">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-civic/15 bg-white shadow-sm ring-1 ring-white/70 transition duration-200 dark:border-emerald-200/20 dark:bg-slate-900 dark:ring-slate-700 sm:h-16 sm:w-16">
            <Image src="/images/nashmi logo.png" alt="شعار منصة نشمي" fill sizes="64px" priority className="object-contain scale-110" />
          </div>
          <span className="hidden text-lg font-black sm:inline dark:text-emerald-200 dark:drop-shadow-sm">نشمي</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link key={link.href} href={link.href} prefetch data-navbar-prefetch={link.href} className="focus-ring rounded px-3 py-2 text-ink/78 hover:bg-civic/5 hover:text-civic dark:text-white/78 dark:hover:bg-slate-800 dark:hover:text-emerald-200">
              <I18nText id={link.labelKey} />
            </Link>
          ))}
          {dashboardHref ? (
            <Link href={dashboardHref} prefetch={false} className="focus-ring rounded px-3 py-2 text-ink/78 hover:bg-civic/5 hover:text-civic dark:text-white/78 dark:hover:bg-slate-800 dark:hover:text-emerald-200">
              <I18nText id="nav.dashboard" />
            </Link>
          ) : null}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle compact />
          <ThemeToggle />
          <Link href="/chat" className="focus-ring inline-flex h-9 items-center rounded border border-civic/35 bg-white/70 px-3 text-sm font-semibold text-civic shadow-sm hover:border-civic hover:bg-civic hover:text-white active:scale-[0.98] dark:border-emerald-200/35 dark:bg-emerald-200/10 dark:text-emerald-100 dark:shadow-none dark:hover:border-emerald-200 dark:hover:bg-emerald-200/18 dark:hover:text-white" aria-label="Smart Assistant">
            <MessageCircle className="me-2 h-4 w-4" />
            <span className="hidden sm:inline"><I18nText id="nav.chat" /></span>
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className="focus-ring inline-flex h-9 items-center rounded bg-civic px-4 text-sm font-semibold text-white hover:bg-civic/90 dark:bg-emerald-200 dark:text-[#101820] dark:hover:bg-emerald-100">
              <I18nText id="nav.login" />
            </Link>
          )}
          <MobileNav links={links} dashboardHref={dashboardHref} />
        </div>
      </div>
    </header>
  );
}
