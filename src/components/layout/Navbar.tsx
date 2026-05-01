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
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-page flex min-h-16 items-center justify-between gap-4 py-3">
        <Link href="/" className="focus-ring flex items-center gap-3 font-bold text-civic" aria-label="الانتقال إلى الصفحة الرئيسية">
          <Image src="/images/nashmi logo.png" alt="شعار منصة نشمي" width={56} height={56} priority unoptimized className="h-12 w-12 rounded-full object-contain" />
          <span className="hidden text-lg font-black sm:inline">نشمي</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="focus-ring hover:text-civic">
              {link.label}
            </Link>
          ))}
          {dashboardHref ? (
            <Link href={dashboardHref} className="focus-ring hover:text-civic">
              لوحة التحكم
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/chat" className="focus-ring inline-flex items-center rounded border border-civic px-3 py-2 text-sm text-civic hover:bg-civic hover:text-white" aria-label="المساعد الذكي">
            <MessageCircle className="ml-2 h-4 w-4" />
            <span className="hidden sm:inline">المساعد الذكي</span>
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className="focus-ring rounded bg-civic px-4 py-2 text-sm font-semibold text-white hover:bg-civic/90">
              دخول
            </Link>
          )}
          <button className="focus-ring rounded border border-line p-2 lg:hidden" aria-label="القائمة">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="container-page flex gap-3 overflow-auto pb-3 text-sm lg:hidden" aria-label="التنقل المختصر">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="focus-ring shrink-0 rounded border border-line px-3 py-1.5 hover:border-civic hover:text-civic">
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
