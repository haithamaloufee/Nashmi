import Link from "next/link";

export default function UserProfileNotFound() {
  return (
    <main className="container-page py-10">
      <section className="rounded border border-line bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/95">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">المستخدم غير موجود</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">قد يكون الحساب غير متاح أو تم تعطيله.</p>
        <Link href="/updates" className="mt-5 inline-flex rounded bg-civic px-4 py-2 font-semibold text-white hover:bg-civic/90">
          العودة إلى المستجدات
        </Link>
      </section>
    </main>
  );
}
