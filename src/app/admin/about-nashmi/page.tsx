import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAboutNashmiContent } from "@/lib/siteContent";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { AboutNashmiAdminForm } from "@/components/dashboard/Forms";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/about-nashmi", label: "عن نشمي" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

export default async function AdminAboutNashmiPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  const content = await getAboutNashmiContent();

  return (
    <DashboardNav title="لوحة الإدارة" links={links}>
      <AboutNashmiAdminForm content={content} />
    </DashboardNav>
  );
}
