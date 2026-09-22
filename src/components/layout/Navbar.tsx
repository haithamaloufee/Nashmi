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
  { href: "/", labelKey: "nav.home" },
  { href: "/updates", labelKey: "nav.updates" },
  { href: "/laws", labelKey: "nav.laws" },
  { href: "/parties", labelKey: "nav.parties" }
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
      <div className="container-page flex min-h-[76px] items-center justify-between gap-3 py-1.5">
        <NavbarPrefetcher routes={primaryLinks.map((link) => link.href)} />
        <Link href="/" prefetch data-navbar-prefetch="/" className="focus-ring group flex shrink-0 items-center rounded-xl" aria-label="Nashmi home">
          <Image
            src="/images/nashmi logo_transparent.png"
            alt="شعار منصة نشمي"
            width={86}
            height={86}
            priority
            className="h-[68px] w-[68px] scale-110 object-contain contrast-110 saturate-110 [filter:drop-shadow(0_0_4px_rgba(255,255,255,.98))_drop-shadow(0_0_17px_rgba(255,255,255,.94))] transition duration-200 group-hover:scale-[1.14] group-hover:[filter:drop-shadow(0_0_5px_rgba(255,255,255,1))_drop-shadow(0_0_20px_rgba(255,255,255,.98))] sm:h-[74px] sm:w-[74px]"
          />
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-bold lg:flex" aria-label="التنقل الرئيسي">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              data-navbar-prefetch={link.href}
              className="focus-ring rounded-xl px-3 py-2.5 text-white/[0.82] hover:bg-white/10 hover:text-white xl:px-4"
            >
              <I18nText id={link.labelKey} />
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <UtilityMenu />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/login" className="focus-ring hidden min-h-11 items-center rounded-xl px-3 text-sm font-bold text-white/[0.86] hover:bg-white/10 hover:text-white sm:inline-flex">
                <I18nText id="nav.login" />
              </Link>
              <Link href="/signup" className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-emerald-200 px-3 text-sm font-black text-[#10252b] shadow-sm hover:bg-emerald-100 sm:px-4">
                <span className="hidden min-[360px]:inline"><I18nText id="auth.signup" /></span>
                <span className="min-[360px]:hidden"><I18nText id="nav.login" /></span>
              </Link>
            </>
          )}
          <MobileNav links={primaryLinks} dashboardHref={dashboardHref} authenticated={Boolean(user)} />
        </div>
      </div>
    </NavbarChrome>
  );
}
