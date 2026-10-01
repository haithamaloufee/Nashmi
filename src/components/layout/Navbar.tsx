import PrimaryNavigation from "@/components/layout/PrimaryNavigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "@/components/layout/UserMenu";
import MobileNav from "@/components/layout/MobileNav";
import NavbarChrome from "@/components/layout/NavbarChrome";
import UtilityMenu from "@/components/layout/UtilityMenu";
import NavbarPrefetcher from "@/components/navigation/NavbarPrefetcher";
import { I18nText } from "@/components/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

const primaryLinks: Array<{ href: string; labelKey: TranslationKey }> = [
  { href: "/updates", labelKey: "nav.home" },
  { href: "/laws", labelKey: "nav.laws" },
  { href: "/parties", labelKey: "nav.parties" },
  { href: "/surveys", labelKey: "nav.surveys" }
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
    <NavbarChrome>
      <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-x-2 lg:flex-nowrap">
        <NavbarPrefetcher routes={["/", ...primaryLinks.map((link) => link.href)]} />
        <Link href="/" prefetch={false} data-navbar-prefetch="/" className="focus-ring group flex h-16 shrink-0 items-center rounded-xl" aria-label="Nashmi home">
          <Image
            src="/images/nashmi logo_transparent.png"
            alt="شعار منصة نشمي"
            width={86}
            height={86}
            priority
            className="h-14 w-14 object-contain"
          />
        </Link>

        <PrimaryNavigation links={primaryLinks} />

        <div className="flex shrink-0 items-center gap-2">
          <UtilityMenu />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/login" className="focus-ring hidden min-h-11 items-center rounded-xl px-3 text-sm font-bold text-civic hover:bg-civic/10 dark:text-emerald-100 sm:inline-flex">
                <I18nText id="nav.login" />
              </Link>
              <Link href="/signup" className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-civic px-3 text-sm font-bold text-white shadow-sm hover:bg-civic/90 dark:bg-emerald-200 dark:text-slate-950 sm:px-4">
                <span className="hidden min-[360px]:inline"><I18nText id="auth.signup" /></span>
                <span className="min-[360px]:hidden"><I18nText id="auth.submitSignup" /></span>
              </Link>
            </>
          )}
          <MobileNav links={primaryLinks} dashboardHref={dashboardHref} authenticated={Boolean(user)} />
        </div>
      </div>
    </NavbarChrome>
  );
}
