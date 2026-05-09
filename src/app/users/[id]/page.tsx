import { notFound } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import ReportButton from "@/components/reports/ReportButton";
import { connectToDatabase } from "@/lib/db";
import { getPublicUserProfile } from "@/lib/publicUser";

export const revalidate = 120;

type PageProps = { params: Promise<{ id: string }> };

const roleLabels: Record<string, string> = {
  citizen: "مواطن",
  party: "حساب حزب",
  iec: "حساب الهيئة",
  admin: "إدارة",
  super_admin: "إدارة عليا"
};

function joinDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ar-JO", { dateStyle: "medium" }).format(new Date(value));
}

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { id } = await params;
  await connectToDatabase();
  const result = await getPublicUserProfile(id);
  if (result.status !== 200 || !result.user) notFound();

  const user = result.user;

  return (
    <main className="container-page py-8">
      <section className="overflow-hidden rounded border border-line bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950/95">
        <div className="h-28 bg-[linear-gradient(135deg,#126b6f,#263f48)] sm:h-36" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <SafeImage
                src={user.avatarUrl}
                alt={user.name}
                className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-sm dark:border-slate-950 dark:bg-slate-900"
                fallback={<div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-civic text-3xl font-black text-white shadow-sm dark:border-slate-950">{user.name.slice(0, 1)}</div>}
                localPrefixes={["/uploads/avatars/", "/uploads/", "/images/"]}
                sizes="96px"
                priority
              />
              <div className="min-w-0 pb-1">
                <h1 className="truncate text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{user.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {user.role ? <span className="rounded border border-civic/20 bg-civic/10 px-2.5 py-1 font-semibold text-civic dark:border-emerald-200/30 dark:bg-emerald-200/12 dark:text-emerald-100">{roleLabels[user.role] || "مستخدم"}</span> : null}
                  {joinDate(user.joinedAt) ? <span>انضم في {joinDate(user.joinedAt)}</span> : null}
                </div>
              </div>
            </div>
            <ReportButton targetType="user" targetId={user.id} />
          </div>

          <section className="mt-6 rounded border border-line bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/80">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">نبذة عني</h2>
            {user.bio ? (
              <p className="mt-3 whitespace-pre-line break-words leading-8 text-slate-700 dark:text-slate-200">{user.bio}</p>
            ) : (
              <p className="mt-3 text-slate-500 dark:text-slate-400">لا توجد نبذة منشورة بعد.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
