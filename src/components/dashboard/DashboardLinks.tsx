"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/i18n/LanguageProvider";
import type { DashboardNavLink } from "./DashboardNav";
export default function DashboardLinks({links}: {links: ReadonlyArray<DashboardNavLink>}) {
  const path = usePathname();
  const { language, t } = useTranslation();
  const base = links.some(link => link.href.startsWith("/party-dashboard")) ? "/party-dashboard" : links.some(link => link.href.startsWith("/iec-dashboard")) ? "/iec-dashboard" : "/admin";
  const items = base === "/admin" ? [
    ["", "الرئيسية", "Overview"], ["/users", "المستخدمون", "Users"], ["/parties", "الأحزاب", "Parties"], ["/laws", "القوانين", "Laws"], ["/surveys", "الاستبيانات", "Surveys"], ["/reports", "البلاغات", "Reports"], ["/moderation", "الإشراف", "Moderation"], ["/logs", "السجلات", "Logs"], ["/audit-logs", "سجل التدقيق", "Audit log"], ["/news", "الأخبار", "News"], ["/about-nashmi", "عن نشمي", "About Nashmi"]
  ] : [["", "الرئيسية", "Overview"], ["/profile", "الملف التعريفي", "Profile"], ["/posts", "المنشورات", "Posts"], ["/polls", "التصويتات", "Polls"], ["/surveys", "الاستبيانات", "Surveys"], ...(base === "/iec-dashboard" ? [["/laws", "القوانين", "Laws"]] : [])];
  const navigation = items.map(([suffix, ar, en]) => ({ href: base + suffix, label: language === "ar" ? ar : en }));
  const extra = links.filter(link => !navigation.some(item => item.href === link.href));
  return <nav aria-label={language === "ar" ? "تنقل لوحة التحكم" : "Dashboard navigation"} className="flex gap-1 overflow-x-auto pb-1 text-sm lg:grid lg:overflow-visible">{[...navigation, ...extra].map(link => <Link key={link.href} href={link.href} aria-current={path === link.href ? "page" : undefined} className="dashboard-link focus-ring hover:bg-civic/10">{'labelKey' in link && link.labelKey ? t(link.labelKey) : link.label}</Link>)}</nav>;
}
