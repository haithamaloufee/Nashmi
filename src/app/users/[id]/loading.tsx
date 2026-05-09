export default function UserProfileLoading() {
  return (
    <main className="container-page py-8">
      <div className="overflow-hidden rounded border border-line bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950/95">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 sm:h-36" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex items-end gap-4">
            <div className="skeleton h-24 w-24 rounded-full" />
            <div className="space-y-3 pb-2">
              <div className="skeleton h-7 w-48 rounded" />
              <div className="skeleton h-5 w-32 rounded" />
            </div>
          </div>
          <div className="skeleton mt-6 h-32 rounded" />
        </div>
      </div>
    </main>
  );
}
