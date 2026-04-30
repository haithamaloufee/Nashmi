import { PostCardSkeleton, SkeletonLine } from "@/components/ui/Skeletons";

export default function IecDashboardLoading() {
  return (
    <main className="container-page py-8">
      <SkeletonLine className="h-9 w-56" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SkeletonLine className="h-24 w-full" />
        <SkeletonLine className="h-24 w-full" />
        <SkeletonLine className="h-24 w-full" />
      </div>
      <div className="mt-6 space-y-4">
        <PostCardSkeleton compact />
        <PostCardSkeleton compact />
      </div>
    </main>
  );
}
