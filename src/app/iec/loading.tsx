import { SkeletonLine } from "@/components/ui/Skeletons";

export default function IecLoading() {
  return (
    <main className="container-page py-8">
      <section className="mb-8 rounded border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SkeletonLine className="h-20 w-20 rounded" />
          <div className="flex-1">
            <SkeletonLine className="h-7 w-40" />
            <SkeletonLine className="mt-4 h-4 w-full max-w-2xl" />
            <SkeletonLine className="mt-2 h-4 w-full max-w-xl" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SkeletonLine className="h-44 w-full" />
          <SkeletonLine className="h-44 w-full" />
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <SkeletonLine className="h-40 w-full" />
          <SkeletonLine className="h-48 w-full" />
          <SkeletonLine className="h-44 w-full" />
        </div>
        <aside className="space-y-6">
          <SkeletonLine className="h-56 w-full" />
          <SkeletonLine className="h-40 w-full" />
        </aside>
      </section>
    </main>
  );
}
