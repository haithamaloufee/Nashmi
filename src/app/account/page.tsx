import { redirect } from "next/navigation";
import AccountProfileForm from "@/components/account/AccountProfileForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">حسابي</h1>
        <p className="mt-2 text-ink/70">إدارة الاسم والصورة الشخصية للحساب.</p>
      </div>
      <AccountProfileForm user={user} />
    </main>
  );
}
