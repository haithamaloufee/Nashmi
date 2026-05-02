import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "@/components/layout/UserMenu";
import ThemeToggle from "@/components/layout/ThemeToggle";
import MobileNav from "@/components/layout/MobileNav";

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
          <Link href="/chat" className="focus-ring inline-flex h-9 items-center rounded border border-civic/35 bg-white/70 px-3 text-sm font-semibold text-civic shadow-sm hover:border-civic hover:bg-civic hover:text-white active:scale-[0.98] dark:border-emerald-200/35 dark:bg-emerald-200/10 dark:text-emerald-100 dark:shadow-none dark:hover:border-emerald-200 dark:hover:bg-emerald-200/18 dark:hover:text-white" aria-label="المساعد الذكي">
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
          <MobileNav links={links} dashboardHref={dashboardHref} />
        </div>
      </div>
    </header>
  );
}
