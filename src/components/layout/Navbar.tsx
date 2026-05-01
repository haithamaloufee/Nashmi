import Image from "next/image";
import Link from "next/link";
import { Menu, MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "@/components/layout/UserMenu";
import ThemeToggle from "@/components/layout/ThemeToggle";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/parties", label: "بوابة الأحزاب" },
  { href: "/iec", label: "الهيئة المستقلة" },
  { href: "/updates", label: "آخر المستجدات" },
  { href: "/laws", label: "افهم قانونك" }
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
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 text-ink shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#101820]/95 dark:text-white">
      <div className="container-page flex min-h-16 items-center justify-between gap-3 py-3">
        <Link href="/" className="focus-ring flex shrink-0 items-center gap-3 font-bold text-civic dark:text-emerald-200" aria-label="الانتقال إلى الصفحة الرئيسية">
          <Image src="/images/nashmi logo.png" alt="شعار منصة نشمي" width={56} height={56} priority unoptimized className="h-12 w-12 rounded-full object-contain" />
          <span className="hidden text-lg font-black sm:inline">نشمي</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="focus-ring rounded px-3 py-2 text-ink/78 hover:bg-civic/5 hover:text-civic dark:text-white/78 dark:hover:bg-white/8 dark:hover:text-emerald-200">
              {link.label}
            </Link>
          ))}
          {dashboardHref ? (
            <Link href={dashboardHref} className="focus-ring rounded px-3 py-2 text-ink/78 hover:bg-civic/5 hover:text-civic dark:text-white/78 dark:hover:bg-white/8 dark:hover:text-emerald-200">
              لوحة التحكم
            </Link>
          ) : null}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link href="/chat" className="focus-ring inline-flex h-9 items-center rounded border border-civic/35 bg-white/70 px-3 text-sm font-semibold text-civic hover:border-civic hover:bg-civic hover:text-white dark:border-emerald-200/30 dark:bg-white/8 dark:text-emerald-200 dark:hover:border-emerald-200 dark:hover:bg-emerald-200 dark:hover:text-[#101820]" aria-label="المساعد الذكي">
            <MessageCircle className="ml-2 h-4 w-4" />
            <span className="hidden sm:inline">المساعد الذكي</span>
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className="focus-ring inline-flex h-9 items-center rounded bg-civic px-4 text-sm font-semibold text-white hover:bg-civic/90 dark:bg-emerald-200 dark:text-[#101820] dark:hover:bg-emerald-100">
              دخول
            </Link>
          )}
          <button className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded border border-line bg-white/70 text-ink hover:border-civic hover:text-civic dark:border-white/15 dark:bg-white/8 dark:text-white/85 dark:hover:border-emerald-200 dark:hover:text-emerald-200 lg:hidden" aria-label="القائمة">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="container-page flex gap-2 overflow-auto pb-3 text-sm font-semibold lg:hidden" aria-label="التنقل المختصر">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="focus-ring shrink-0 rounded border border-line bg-white/60 px-3 py-1.5 text-ink/78 hover:border-civic hover:text-civic dark:border-white/12 dark:bg-white/8 dark:text-white/78 dark:hover:border-emerald-200 dark:hover:text-emerald-200">
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
