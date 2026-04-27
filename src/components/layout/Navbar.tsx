import Link from "next/link";
import { Menu, MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/layout/LogoutButton";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/parties", label: "بوابة الأحزاب" },
  { href: "/iec", label: "الهيئة المستقلة" },
  { href: "/updates", label: "آخر المستجدات" },
  { href: "/laws", label: "افهم قانونك" },
  { href: "/chat", label: "المساعد الذكي" }
];

export default async function Navbar() {
  const user = await getCurrentUser();
  const dashboardHref = user?.role === "party" ? "/party-dashboard" : user?.role === "iec" ? "/iec-dashboard" : user?.role === "admin" || user?.role === "super_admin" ? "/admin" : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-page flex min-h-16 items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-civic">
          <span className="grid h-10 w-10 place-items-center rounded bg-civic text-white">ش</span>
          <span>شارك</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-civic">
              {link.label}
            </Link>
          ))}
          {dashboardHref ? (
            <Link href={dashboardHref} className="hover:text-civic">
              لوحة التحكم
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/chat" className="hidden rounded border border-civic px-3 py-2 text-sm text-civic sm:flex">
            <MessageCircle className="ml-2 h-4 w-4" />
            اسأل المساعد
          </Link>
          {user ? (
            <>
              <span className="hidden text-sm text-ink/70 md:inline">{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="rounded bg-civic px-4 py-2 text-sm font-semibold text-white">
              دخول
            </Link>
          )}
          <button className="rounded border border-line p-2 lg:hidden" aria-label="القائمة">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="container-page flex gap-3 overflow-auto pb-3 text-sm lg:hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 rounded border border-line px-3 py-1.5">
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
