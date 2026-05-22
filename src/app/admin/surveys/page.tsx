import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { serialize } from "@/lib/routeUtils";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import SurveyBuilderForm from "@/components/surveys/SurveyBuilderForm";
import Survey from "@/models/Survey";
import Party from "@/models/Party";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/parties", label: "الأحزاب" },
  { href: "/admin/moderation", label: "الإشراف" },
  { href: "/admin/surveys", label: "الاستبيانات" },
  { href: "/admin/about-nashmi", label: "عن نشمي" },
  { href: "/admin/logs", label: "سجل التدقيق" }
];

export default async function AdminSurveysPage() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) redirect("/login");
  await connectToDatabase();
  const [surveys, parties] = await Promise.all([
    Survey.find({ status: { $ne: "deleted" } }).populate({ path: "partyId", select: "name slug" }).sort({ createdAt: -1 }).limit(100).lean(),
    Party.find({ status: { $ne: "disabled" } }).select("name").sort({ name: 1 }).limit(200).lean()
  ]);
  return (
    <DashboardNav title="لوحة الإدارة" links={links} wide>
      <SurveyBuilderForm surveys={serialize(surveys) as any} parties={serialize(parties) as any} mode="admin" />
    </DashboardNav>
  );
}
